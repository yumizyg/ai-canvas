import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const user = await requireUser();
    const job = await prisma.generationJob.findUnique({
      where: { id: context.params.id },
      include: { resultAsset: true, canvas: true }
    });
    if (!job) return Response.json({ message: "Not found" }, { status: 404 });
    if (user.role !== "admin" && job.creatorId !== user.id && job.canvas.ownerId !== user.id) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }
    return {
      job: {
        id: job.id,
        status: job.status,
        error: job.error,
        asset: job.resultAsset
          ? {
              id: job.resultAsset.id,
              url: `/api/assets/${job.resultAsset.id}/file`,
              width: job.resultAsset.width,
              height: job.resultAsset.height
            }
          : null
      }
    };
  });
}
