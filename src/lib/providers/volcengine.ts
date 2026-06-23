import type { GenerateImageParams, GenerateVideoParams, GeneratedImage, GeneratedVideo, ModelProviderAdapter } from "./types";

type VolcengineImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
  message?: string;
};

type VolcengineTaskCreateResponse = {
  id?: string;
  task_id?: string;
  data?: { id?: string; task_id?: string };
  error?: { message?: string };
  message?: string;
};

type VolcengineTaskStatusResponse = {
  id?: string;
  status?: string;
  data?: {
    status?: string;
    video_url?: string;
    url?: string;
    output?: string | Array<{ url?: string; video_url?: string }>;
  };
  result?: {
    video_url?: string;
    url?: string;
    output?: string | Array<{ url?: string; video_url?: string }>;
  };
  output?: string | Array<{ url?: string; video_url?: string }>;
  video_url?: string;
  url?: string;
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
        size: normalizeSeedreamSize(params),
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

  async generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
    if (!this.apiKey) {
      throw new Error("火山引擎 API Key 未配置");
    }

    const taskUrl = this.baseUrl.includes("/images/generations")
      ? this.baseUrl.replace("/images/generations", "/contents/generations/tasks")
      : "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

    const content: Array<Record<string, unknown>> = [{ type: "text", text: params.prompt }];
    if (params.referenceAssetUrl) {
      content.push({ type: "image_url", image_url: { url: params.referenceAssetUrl } });
    }

    const createResponse = await fetch(taskUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: normalizeSeedanceModelId(params.modelSlug),
        content,
        ratio: params.aspectRatio ?? "16:9",
        resolution: params.resolution ?? params.size ?? "1080p",
        duration: params.duration ?? 5,
        fps: params.fps ?? 24
      })
    });

    const created = (await createResponse.json()) as VolcengineTaskCreateResponse;
    if (!createResponse.ok) {
      throw new Error(created.error?.message ?? created.message ?? "火山引擎 Seedance 任务创建失败");
    }

    const taskId = created.id ?? created.task_id ?? created.data?.id ?? created.data?.task_id;
    if (!taskId) {
      throw new Error("火山引擎 Seedance 没有返回任务 ID");
    }

    const statusUrl = `${taskUrl}/${taskId}`;
    const deadline = Date.now() + 1000 * 60 * 8;
    let lastStatus = "queued";
    while (Date.now() < deadline) {
      await sleep(3000);
      const statusResponse = await fetch(statusUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      const statusJson = (await statusResponse.json()) as VolcengineTaskStatusResponse;
      if (!statusResponse.ok) {
        throw new Error(statusJson.error?.message ?? statusJson.message ?? "火山引擎 Seedance 查询任务失败");
      }
      lastStatus = String(statusJson.status ?? statusJson.data?.status ?? "").toLowerCase();
      const videoUrl = extractVideoUrl(statusJson);
      if (videoUrl) {
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error("火山引擎 Seedance 视频下载失败");
        }
        return {
          mimeType: videoResponse.headers.get("content-type") ?? "video/mp4",
          data: Buffer.from(await videoResponse.arrayBuffer())
        };
      }
      if (["succeeded", "success", "completed", "done"].includes(lastStatus)) {
        throw new Error(`火山引擎 Seedance 任务已成功，但没有找到视频链接：${summarizeTaskResponse(statusJson)}`);
      }
      if (["failed", "error", "cancelled", "canceled"].includes(lastStatus)) {
        throw new Error(statusJson.error?.message ?? statusJson.message ?? `火山引擎 Seedance 任务失败：${lastStatus}`);
      }
    }

    throw new Error(`火山引擎 Seedance 任务超时：${lastStatus}`);
  }
}

function normalizeSeedreamSize(params: GenerateImageParams) {
  if (params.width && params.height) {
    const size = ensureSeedreamMinimumPixels(params.width, params.height);
    return `${size.width}x${size.height}`;
  }
  const size = params.size;
  const match = size.match(/^(\d+)x(\d+)$/i);
  if (match) {
    const normalized = ensureSeedreamMinimumPixels(Number(match[1]), Number(match[2]));
    return `${normalized.width}x${normalized.height}`;
  }
  if (size === "1K" || size === "2K" || size === "4K") return size;
  return "2K";
}

function ensureSeedreamMinimumPixels(width: number, height: number) {
  const minPixels = 921600;
  const safeWidth = Math.max(64, Math.round(width / 2) * 2);
  const safeHeight = Math.max(64, Math.round(height / 2) * 2);
  if (safeWidth * safeHeight >= minPixels) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = Math.sqrt(minPixels / (safeWidth * safeHeight));
  const nextWidth = Math.max(64, Math.ceil((safeWidth * scale) / 2) * 2);
  const nextHeight = Math.max(64, Math.ceil((safeHeight * scale) / 2) * 2);
  return nextWidth * nextHeight >= minPixels ? { width: nextWidth, height: nextHeight } : { width: nextWidth + 2, height: nextHeight + 2 };
}

function extractVideoUrl(json: VolcengineTaskStatusResponse) {
  const candidates = [
    json.video_url,
    json.url,
    json.data?.video_url,
    json.data?.url,
    json.result?.video_url,
    json.result?.url,
    extractOutputUrl(json.output),
    extractOutputUrl(json.data?.output),
    extractOutputUrl(json.result?.output),
    ...findUrlsDeep(json)
  ];
  return candidates.find((value): value is string => Boolean(value));
}

function extractOutputUrl(output?: string | Array<{ url?: string; video_url?: string }>) {
  if (!output) return undefined;
  if (typeof output === "string") return output;
  return output.map((item) => item.video_url ?? item.url).find(Boolean);
}

function findUrlsDeep(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => findUrlsDeep(item));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => findUrlsDeep(item));
  }
  return [];
}

function summarizeTaskResponse(json: VolcengineTaskStatusResponse) {
  const seen = new WeakSet<object>();
  return JSON.stringify(json, (_key, value) => {
    if (typeof value === "string" && value.length > 180) return `${value.slice(0, 180)}...`;
    if (value && typeof value === "object") {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  }).slice(0, 1200);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    "doubao-seedance-1-5-pro": "doubao-seedance-1-5-pro-251215",
    "doubao-seedance-1-5-pro-251215": "doubao-seedance-1-5-pro-251215",
    "seedance-1-5-pro": "doubao-seedance-1-5-pro-251215",
    "seedance-1-5": "doubao-seedance-1-5-pro-251215",
    "seedance-1.5-pro": "doubao-seedance-1-5-pro-251215",
    "doubao-seedance-1-0-pro": "doubao-seedance-1-0-pro-250528",
    "doubao-seedance-1-0-pro-250528": "doubao-seedance-1-0-pro-250528",
    "seedance-1-0-pro": "doubao-seedance-1-0-pro-250528",
    "seedance-1-0": "doubao-seedance-1-0-pro-250528",
    "seedance-1.0-pro": "doubao-seedance-1-0-pro-250528"
  };
  return aliases[normalized] ?? value;
}
