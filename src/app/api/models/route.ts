import { requireUser } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return routeHandler(async () => {
    await requireUser();
    const models = await prisma.model.findMany({
      where: { enabled: true, provider: { enabled: true } },
      include: { provider: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "asc" }
    });

    return {
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        slug: model.slug,
        type: model.type,
        supportedSizes: model.supportedSizes,
        defaultParams: model.defaultParams,
        provider: model.provider
      }))
    };
  });
}
