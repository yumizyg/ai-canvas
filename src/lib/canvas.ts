import type { Edge, Node } from "@xyflow/react";

export type CanvasNodeData = {
  label?: string;
  prompt?: string;
  negativePrompt?: string;
  modelId?: string;
  size?: string;
  aspectRatio?: string;
  resolution?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  seed?: number;
  count?: number;
  assetId?: string;
  assetUrl?: string;
  assetMimeType?: string;
  jobId?: string;
  jobStatus?: string;
  error?: string;
  resolvedPrompt?: string;
  referenceAssetId?: string;
};

export function validateConnection(sourceType: string, targetType: string, targetHandle?: string | null) {
  if (targetType === "imageGen" && targetHandle === "prompt") {
    return sourceType === "prompt";
  }
  if (targetType === "imageGen" && targetHandle === "reference") {
    return sourceType === "asset" || sourceType === "imageGen";
  }
  if (targetType === "videoGen" && targetHandle === "prompt") {
    return sourceType === "prompt";
  }
  if (targetType === "videoGen" && targetHandle === "reference") {
    return sourceType === "asset" || sourceType === "imageGen";
  }
  if (targetType === "output") {
    return sourceType === "asset" || sourceType === "imageGen" || sourceType === "videoGen";
  }
  return false;
}

export function resolveGenerationInputs(nodes: Node<CanvasNodeData>[], edges: Edge[], imageGenNodeId: string) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const targetEdges = edges.filter((edge) => edge.target === imageGenNodeId);
  const promptNodes = targetEdges
    .filter((edge) => edge.targetHandle === "prompt")
    .map((edge) => nodeById.get(edge.source))
    .filter(Boolean);
  const referenceNode = targetEdges
    .filter((edge) => edge.targetHandle === "reference")
    .map((edge) => nodeById.get(edge.source))
    .find(Boolean);

  const currentNode = nodeById.get(imageGenNodeId);
  const ownPrompt = currentNode?.data.prompt ?? "";
  const upstreamPrompt = promptNodes
    .map((node) => node?.data.prompt ?? node?.data.label ?? "")
    .filter(Boolean)
    .join("\n");

  return {
    prompt: [upstreamPrompt, ownPrompt].filter(Boolean).join("\n"),
    referenceAssetId: referenceNode?.data.assetId,
    referenceAssetUrl: referenceNode?.data.assetUrl
  };
}
