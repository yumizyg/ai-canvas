import { requireAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return routeHandler(async () => {
    await requireAdmin();
    const [users, totalCanvases, totalJobs, totalAssets, jobsByStatus, models] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { canvases: true, jobs: true, assets: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.canvas.count(),
      prisma.generationJob.count(),
      prisma.asset.count(),
      prisma.generationJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.model.findMany({ select: { id: true, name: true, slug: true, enabled: true, provider: { select: { name: true } } } })
    ]);

    const usageByUser = await prisma.generationJob.groupBy({
      by: ["creatorId", "status"],
      _count: { _all: true }
    });
    const usageMap = new Map<string, Record<string, number>>();
    for (const row of usageByUser) {
      const current = usageMap.get(row.creatorId) ?? {};
      current[row.status] = row._count._all;
      usageMap.set(row.creatorId, current);
    }

    return {
      totals: {
        users: users.length,
        activeUsers: users.filter((user) => user.status === "active").length,
        canvases: totalCanvases,
        jobs: totalJobs,
        assets: totalAssets,
        enabledModels: models.filter((model) => model.enabled).length
      },
      jobsByStatus: jobsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      users: users.map((user) => ({
        ...user,
        usage: usageMap.get(user.id) ?? {}
      })),
      models
    };
  });
}
