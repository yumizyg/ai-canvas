import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { normalizeSeedanceModelId, normalizeSeedreamModelId } from "@/lib/providers/volcengine";

export const dynamic = "force-dynamic";

const modelSchema = z.object({
  preset: z.enum(["volcengine-seedream", "volcengine-seedance", "custom"]).default("custom"),
  providerSlug: z.string().min(1).optional(),
  providerName: z.string().min(1).optional(),
  apiKeyEnv: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  modelName: z.string().min(1),
  modelSlug: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
  supportedSizes: z.array(z.string()).min(1).optional(),
  defaultParams: z.record(z.unknown()).default({})
});

export async function GET() {
  return routeHandler(async () => {
    await requireAdmin();
    const providers = await prisma.modelProvider.findMany({
      include: { models: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" }
    });

    return {
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        enabled: provider.enabled,
        apiKeyEnv: provider.apiKeyEnv,
        hasApiKey: Boolean(provider.apiKeySecret || (provider.apiKeyEnv && process.env[provider.apiKeyEnv])),
        baseUrl: provider.baseUrl,
        models: provider.models.map((model) => ({
          id: model.id,
          name: model.name,
          slug: model.slug,
          type: model.type,
          enabled: model.enabled,
          supportedSizes: model.supportedSizes,
          defaultParams: model.defaultParams,
          createdAt: model.createdAt
        }))
      }))
    };
  });
}

export async function POST(request: Request) {
  return routeHandler(async () => {
    await requireAdmin();
    const body = modelSchema.parse(await request.json());
    const isSeedream = body.preset === "volcengine-seedream";
    const isSeedance = body.preset === "volcengine-seedance";
    const providerSlug = isSeedream ? "volcengine-seedream" : isSeedance ? "volcengine-seedance" : body.providerSlug!;
    const providerName = isSeedream ? "火山引擎 Seedream" : isSeedance ? "火山引擎 Seedance" : body.providerName!;
    const rawModel = body.modelSlug ?? body.modelName;
    const modelSlug = isSeedream ? normalizeSeedreamModelId(rawModel) : isSeedance ? normalizeSeedanceModelId(rawModel) : rawModel.trim();
    const modelName = isSeedream ? getSeedreamDisplayName(modelSlug) : isSeedance ? getSeedanceDisplayName(modelSlug) : body.modelName;
    const supportedSizes = body.supportedSizes ?? (isSeedream ? ["2K", "1K", "4K"] : isSeedance ? ["720p", "1080p"] : ["1024x1024"]);
    const defaultParams = isSeedream
      ? { size: "2K", response_format: "url", watermark: false, stream: false }
      : isSeedance
        ? { resolution: "1080p", duration: 5, ratio: "16:9" }
        : body.defaultParams;
    const modelType = isSeedance ? "video" : "image";

    const provider = await prisma.modelProvider.upsert({
      where: { slug: providerSlug },
      create: {
        slug: providerSlug,
        name: providerName,
        apiKeyEnv: body.apiKeyEnv,
        apiKeySecret: body.apiKey,
        baseUrl: body.baseUrl,
        enabled: body.enabled
      },
      update: {
        name: providerName,
        apiKeyEnv: body.apiKeyEnv,
        apiKeySecret: body.apiKey || undefined,
        baseUrl: body.baseUrl,
        enabled: body.enabled
      }
    });

    const model = await prisma.model.upsert({
      where: { slug: modelSlug },
      create: {
        providerId: provider.id,
        slug: modelSlug,
        name: modelName,
        type: modelType,
        enabled: body.enabled,
        supportedSizes: supportedSizes as Prisma.InputJsonValue,
        defaultParams: defaultParams as Prisma.InputJsonValue
      },
      update: {
        providerId: provider.id,
        name: modelName,
        type: modelType,
        enabled: body.enabled,
        supportedSizes: supportedSizes as Prisma.InputJsonValue,
        defaultParams: defaultParams as Prisma.InputJsonValue
      }
    });

    return { model };
  });
}

function getSeedreamDisplayName(modelSlug: string) {
  if (modelSlug.includes("5-0")) return "Seedream 5.0";
  if (modelSlug.includes("4-5")) return "Seedream 4.5";
  return "Seedream 4.0";
}

function getSeedanceDisplayName(modelSlug: string) {
  if (modelSlug.includes("1-5")) return "Seedance 1.5 Pro";
  return "Seedance 1.0 Pro";
}
