import type { GenerateImageParams, GeneratedImage, ModelProviderAdapter } from "@/lib/providers/types";

type DashScopeTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{ url?: string }>;
  };
  message?: string;
};

export class AliyunWanxProvider implements ModelProviderAdapter {
  constructor(private readonly apiKey: string) {}

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    if (!this.apiKey) {
      throw new Error("ALIYUN_DASHSCOPE_API_KEY is not configured");
    }

    const createResponse = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable"
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt
        },
        parameters: {
          size: params.size,
          n: params.count ?? 1,
          seed: params.seed
        }
      })
    });

    const createJson = (await createResponse.json()) as DashScopeTaskResponse;
    const taskId = createJson.output?.task_id;
    if (!createResponse.ok || !taskId) {
      throw new Error(createJson.message ?? "Failed to create DashScope task");
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      const pollJson = (await pollResponse.json()) as DashScopeTaskResponse;
      const status = pollJson.output?.task_status;

      if (status === "SUCCEEDED") {
        const url = pollJson.output?.results?.[0]?.url;
        if (!url) throw new Error("DashScope task succeeded without image URL");
        const imageResponse = await fetch(url);
        const data = Buffer.from(await imageResponse.arrayBuffer());
        return {
          mimeType: imageResponse.headers.get("content-type") ?? "image/png",
          data
        };
      }

      if (status === "FAILED" || status === "UNKNOWN") {
        throw new Error(pollJson.message ?? `DashScope task ${status}`);
      }
    }

    throw new Error("DashScope task timed out");
  }
}
