import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return routeHandler(async () => {
    const user = await requireUser();
    const canvases = await prisma.canvas.findMany({
      where: user.role === "admin" ? {} : { ownerId: user.id },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    });
    return { canvases };
  });
}

export async function POST(request: Request) {
  return routeHandler(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const canvas = await prisma.canvas.create({
      data: { ownerId: user.id, title: body.title?.trim() || "未命名画布" },
      select: { id: true, title: true, updatedAt: true }
    });
    return { canvas };
  });
}
