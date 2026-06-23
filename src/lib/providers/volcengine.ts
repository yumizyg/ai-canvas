import type { GenerateImageParams, GeneratedImage, ModelProviderAdapter } from "@/lib/providers/types";

type VolcengineImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
  message?: string;
};

export class VolcengineSeedreamProvider implements ModelProviderAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
  ) {}

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    if (!this.apiKey) {
      throw new Error("火山引擎 API Key 未配置");
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: normalizeSeedreamModelId(params.modelSlug),
        prompt: params.prompt,
        size: normalizeSeedreamSize(params.resolution ?? params.size),
        response_format: "url",
        watermark: false,
        stream: false
      })
    });

    const json = (await response.json()) as VolcengineImageResponse;
    if (!response.ok) {
      throw new Error(json.error?.message ?? json.message ?? "火山引擎 Seedream 调用失败");
    }

    const item = json.data?.[0];
    if (!item?.url && !item?.b64_json) {
      throw new Error("火山引擎返回结果中没有图片");
    }

    if (item.b64_json) {
      return {
        mimeType: "image/png",
        data: Buffer.from(item.b64_json, "base64")
      };
    }

    const imageResponse = await fetch(item.url!);
    if (!imageResponse.ok) {
      throw new Error("火山引擎图片下载失败");
    }

    return {
      mimeType: imageResponse.headers.get("content-type") ?? "image/png",
      data: Buffer.from(await imageResponse.arrayBuffer())
    };
  }
}

function normalizeSeedreamSize(size: string) {
  if (size === "1K" || size === "2K" || size === "4K") return size;
  return "2K";
}

export function normalizeSeedreamModelId(modelSlug?: string) {
  const value = (modelSlug ?? "").trim();
  const normalized = value.toLowerCase().replace(/[\s_.]+/g, "-");
  const aliases: Record<string, string> = {
    "doubao-seedream-5-0": "doubao-seedream-5-0-pro-250908",
    "doubao-seedream-5": "doubao-seedream-5-0-pro-250908",
    "seedream-5-0": "doubao-seedream-5-0-pro-250908",
    "seedream-5": "doubao-seedream-5-0-pro-250908",
    "doubao-seedream-4-5": "doubao-seedream-4-5",
    "seedream-4-5": "doubao-seedream-4-5",
    "doubao-seedream-4-0": "doubao-seedream-4-0-250828",
    "doubao-seedream-4": "doubao-seedream-4-0-250828",
    "doubao-seedream-4-0-250828": "doubao-seedream-4-0-250828",
    "seedream-4-0": "doubao-seedream-4-0-250828",
    "seedream-4": "doubao-seedream-4-0-250828",
    "seedream-4-0-250828": "doubao-seedream-4-0-250828"
  };
  return aliases[normalized] ?? value;
}

export function normalizeSeedanceModelId(modelSlug?: string) {
  const value = (modelSlug ?? "").trim();
  const normalized = value.toLowerCase().replace(/[\s_.]+/g, "-");
  const aliases: Record<string, string> = {
    "doubao-seedance-1-5-pro": "doubao-seedance-1-5-pro",
    "seedance-1-5-pro": "doubao-seedance-1-5-pro",
    "seedance-1-5": "doubao-seedance-1-5-pro",
    "seedance-1.5-pro": "doubao-seedance-1-5-pro",
    "doubao-seedance-1-0-pro": "doubao-seedance-1-0-pro",
    "seedance-1-0-pro": "doubao-seedance-1-0-pro",
    "seedance-1-0": "doubao-seedance-1-0-pro",
    "seedance-1.0-pro": "doubao-seedance-1-0-pro"
  };
  return aliases[normalized] ?? value;
}
