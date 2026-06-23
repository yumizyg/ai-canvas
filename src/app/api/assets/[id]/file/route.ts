import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const user = await requireUser();
    const asset = await prisma.asset.findUnique({ where: { id: context.params.id } });
    if (!asset) return Response.json({ message: "Not found" }, { status: 404 });
    if (user.role !== "admin" && asset.ownerId !== user.id) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }
    await stat(asset.filePath);
    const stream = createReadStream(asset.filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=3600"
      }
    });
  });
}
