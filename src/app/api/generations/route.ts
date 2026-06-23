import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { getGenerationQueue } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const generationSchema = z.object({
  canvasId: z.string(),
  nodeId: z.string(),
  modelId: z.string(),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  size: z.string().min(1),
  aspectRatio: z.string().optional(),
  resolution: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  seed: z.number().optional(),
  count: z.number().int().min(1).max(4).default(1),
  referenceAssetId: z.string().optional(),
  referenceAssetUrl: z.string().optional()
});

export async function POST(request: Request) {
  return routeHandler(async () => {
    const user = await requireUser();
    const body = generationSchema.parse(await request.json());
    const canvas = await prisma.canvas.findUnique({ where: { id: body.canvasId } });
    if (!canvas) return Response.json({ message: "Canvas not found" }, { status: 404 });
    if (user.role !== "admin" && canvas.ownerId !== user.id) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const model = await prisma.model.findFirst({
      where: { id: body.modelId, enabled: true, provider: { enabled: true } }
    });
    if (!model) return Response.json({ message: "Model not available" }, { status: 400 });

    const job = await prisma.generationJob.create({
      data: {
        canvasId: body.canvasId,
        nodeId: body.nodeId,
        modelId: body.modelId,
        creatorId: user.id,
        parameters: body
      }
    });

    await getGenerationQueue().add("generate-image" as never, { generationJobId: job.id }, { attempts: 2, backoff: { type: "exponential", delay: 2000 } });
    return { job: { id: job.id, status: job.status } };
  });
}
