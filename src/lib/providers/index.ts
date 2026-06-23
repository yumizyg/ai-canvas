import type { ModelProvider } from "@prisma/client";
import type { ModelProviderAdapter } from "./types";
import { AliyunWanxProvider } from "./aliyun";
import { MockImageProvider } from "./mock";
import { VolcengineSeedreamProvider } from "./volcengine";

export function getProviderAdapter(provider: Pick<ModelProvider, "slug" | "apiKeyEnv" | "apiKeySecret" | "baseUrl">): ModelProviderAdapter {
  if (provider.slug === "aliyun-dashscope") {
    const key = provider.apiKeySecret || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] ?? "" : "");
    return new AliyunWanxProvider(key);
  }
  if (provider.slug === "volcengine-seedream" || provider.slug === "volcengine-seedance") {
    const key = provider.apiKeySecret || (provider.apiKeyEnv ? process.env[provider.apiKeyEnv] ?? "" : "");
    return new VolcengineSeedreamProvider(key, provider.baseUrl || undefined);
  }
  return new MockImageProvider();
}
