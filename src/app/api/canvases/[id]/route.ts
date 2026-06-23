import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.unknown(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.record(z.unknown()).default({})
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  data: z.record(z.unknown()).optional()
});

const saveSchema = z.object({
  title: z.string().min(1).optional(),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema)
});

async function getAuthorizedCanvas(id: string, userId: string, role: string) {
  const canvas = await prisma.canvas.findUnique({ where: { id } });
  if (!canvas) throw new Response("Not found", { status: 404 });
  if (role !== "admin" && canvas.ownerId !== userId) {
    throw new Response("Forbidden", { status: 403 });
  }
  return canvas;
}

export async function GET(_: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const user = await requireUser();
    const canvas = await getAuthorizedCanvas(context.params.id, user.id, user.role);
    const [nodes, edges] = await Promise.all([
      prisma.canvasNode.findMany({ where: { canvasId: canvas.id } }),
      prisma.canvasEdge.findMany({ where: { canvasId: canvas.id } })
    ]);

    return {
      canvas: {
        id: canvas.id,
        title: canvas.title,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          width: (node.size as { width?: number } | null)?.width,
          height: (node.size as { height?: number } | null)?.height,
          data: node.data
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: edge.data ?? undefined
        }))
      }
    };
  });
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const user = await requireUser();
    const canvas = await getAuthorizedCanvas(context.params.id, user.id, user.role);
    const body = saveSchema.parse(await request.json());
    const nodeIds = body.nodes.map((node) => node.id);
    const edgeIds = body.edges.map((edge) => edge.id);

    await prisma.$transaction([
      prisma.canvas.update({
        where: { id: canvas.id },
        data: { title: body.title ?? canvas.title }
      }),
      prisma.canvasNode.deleteMany({
        where: { canvasId: canvas.id, id: { notIn: nodeIds.length ? nodeIds : [""] } }
      }),
      prisma.canvasEdge.deleteMany({
        where: { canvasId: canvas.id, id: { notIn: edgeIds.length ? edgeIds : [""] } }
      }),
      ...body.nodes.map((node) =>
        prisma.canvasNode.upsert({
          where: { id: node.id },
          create: {
            id: node.id,
            canvasId: canvas.id,
            type: node.type,
            position: node.position as Prisma.InputJsonValue,
            size: { width: node.width, height: node.height } as Prisma.InputJsonValue,
            data: node.data as Prisma.InputJsonValue
          },
          update: {
            type: node.type,
            position: node.position as Prisma.InputJsonValue,
            size: { width: node.width, height: node.height } as Prisma.InputJsonValue,
            data: node.data as Prisma.InputJsonValue
          }
        })
      ),
      ...body.edges.map((edge) =>
        prisma.canvasEdge.upsert({
          where: { id: edge.id },
          create: {
            id: edge.id,
            canvasId: canvas.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: edge.data as Prisma.InputJsonValue | undefined
          },
          update: {
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: edge.data as Prisma.InputJsonValue | undefined
          }
        })
      )
    ]);

    return { ok: true };
  });
}
