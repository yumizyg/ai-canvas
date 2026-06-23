import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { writeAssetFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return routeHandler(async () => {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ message: "请选择要上传的图片文件" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ message: "只支持上传图片素材" }, { status: 400 });
    }

    const assetId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await writeAssetFile(assetId, file.type, buffer);
    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        ownerId: user.id,
        mimeType: file.type,
        filePath
      }
    });

    return {
      asset: {
        id: asset.id,
        mimeType: asset.mimeType,
        url: `/api/assets/${asset.id}/file`,
        createdAt: asset.createdAt
      }
    };
  });
}
