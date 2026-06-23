import type { ModelProvider } from "@prisma/client";
import type { ModelProviderAdapter } from "@/lib/providers/types";
import { AliyunWanxProvider } from "@/lib/providers/aliyun";
import { MockImageProvider } from "@/lib/providers/mock";
import { VolcengineSeedreamProvider } from "@/lib/providers/volcengine";

export function getProviderAdapter(provider: Pick<ModelProvider, "slug" | "apiKeyEnv" | "apiKeySecret" | "baseUrl">): ModelProviderAdapter {
  if (provider.slug === "aliyun-dashscope") {
    const key = provider.apiKeySecret || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] ?? "" : "");
    return new AliyunWanxProvider(key);
  }
  if (provider.slug === "volcengine-seedream") {
    const key = provider.apiKeySecret || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] ?? "" : "");
    return new VolcengineSeedreamProvider(key, provider.baseUrl || undefined);
  }
  return new MockImageProvider();
}
