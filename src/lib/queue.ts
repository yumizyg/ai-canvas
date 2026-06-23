import { Queue, type ConnectionOptions } from "bullmq";

export type GenerationQueuePayload = {
  generationJobId: string;
};

function redisConnectionFromUrl(urlString: string): ConnectionOptions {
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null
  };
}

export const connection = redisConnectionFromUrl(process.env.REDIS_URL ?? "redis://localhost:6379");

let queue: Queue<GenerationQueuePayload, unknown, string, GenerationQueuePayload, unknown, string> | null = null;

export function getGenerationQueue() {
  queue ??= new Queue("generation", { connection });
  return queue;
}
