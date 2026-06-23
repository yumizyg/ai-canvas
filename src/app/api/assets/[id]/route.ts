import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { appPath } from "@/lib/app-path";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const user = await requireUser();
    const asset = await prisma.asset.findUnique({ where: { id: context.params.id } });
    if (!asset) return Response.json({ message: "Not found" }, { status: 404 });
    if (user.role !== "admin" && asset.ownerId !== user.id) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }
    return {
      asset: {
        id: asset.id,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        url: appPath(`/api/assets/${asset.id}/file`),
        createdAt: asset.createdAt
      }
    };
  });
}
