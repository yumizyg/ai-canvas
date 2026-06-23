import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Worker } from "bullmq";
import { prisma } from "./lib/prisma";
import { connection } from "./lib/queue";
import { writeAssetFile } from "./lib/storage";
import { getProviderAdapter } from "./lib/providers";
import type { GenerateImageParams, GenerateVideoParams } from "./lib/providers/types";

const worker = new Worker(
  "generation",
  async (queueJob) => {
    const { generationJobId } = queueJob.data as { generationJobId: string };
    const job = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
      include: { model: { include: { provider: true } } }
    });

    if (!job) {
      throw new Error(`Generation job not found: ${generationJobId}`);
    }

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "running", error: null }
    });

    try {
      const adapter = getProviderAdapter(job.model.provider);
      const params = { ...(job.parameters as GenerateImageParams | GenerateVideoParams), modelSlug: job.model.slug };
      if (params.referenceAssetId) {
        const referenceAsset = await prisma.asset.findUnique({ where: { id: params.referenceAssetId } });
        if (referenceAsset?.mimeType.startsWith("image/")) {
          const data = await readFile(referenceAsset.filePath);
          params.referenceAssetUrl = `data:${referenceAsset.mimeType};base64,${data.toString("base64")}`;
        }
      }
      const generatedAsset =
        job.model.type === "video"
          ? await (adapter.generateVideo ? adapter.generateVideo(params as GenerateVideoParams) : Promise.reject(new Error("当前模型供应商还没有接入视频生成")))
          : await adapter.generateImage(params as GenerateImageParams);
      const assetId = randomUUID();
      const filePath = await writeAssetFile(assetId, generatedAsset.mimeType, generatedAsset.data);

      await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            id: assetId,
            ownerId: job.creatorId,
            sourceJobId: job.id,
            mimeType: generatedAsset.mimeType,
            filePath,
            width: generatedAsset.width,
            height: generatedAsset.height
          }
        });

        await tx.generationJob.update({
          where: { id: job.id },
          data: { status: "succeeded", resultAssetId: asset.id, error: null }
        });

        const node = await tx.canvasNode.findUnique({ where: { id: job.nodeId } });
        if (node) {
          await tx.canvasNode.update({
            where: { id: job.nodeId },
            data: {
              data: {
                ...((node.data as Record<string, unknown>) ?? {}),
                assetId: asset.id,
                assetUrl: `/api/assets/${asset.id}/file`,
                assetMimeType: generatedAsset.mimeType,
                jobId: job.id,
                jobStatus: "succeeded"
              }
            }
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error";
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "failed", error: message }
      });
      const node = await prisma.canvasNode.findUnique({ where: { id: job.nodeId } });
      if (node) {
        await prisma.canvasNode.update({
          where: { id: job.nodeId },
          data: {
            data: {
              ...((node.data as Record<string, unknown>) ?? {}),
              jobId: job.id,
              jobStatus: "failed",
              error: message
            }
          }
        });
      }
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Generation queue job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Generation queue job failed: ${job?.id}`, error);
});
