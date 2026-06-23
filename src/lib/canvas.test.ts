import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { resolveGenerationInputs, validateConnection, type CanvasNodeData } from "@/lib/canvas";

describe("canvas connection rules", () => {
  it("allows prompt nodes to feed image generation prompts", () => {
    expect(validateConnection("prompt", "imageGen", "prompt")).toBe(true);
    expect(validateConnection("asset", "imageGen", "prompt")).toBe(false);
  });

  it("allows image-like nodes to feed reference image inputs", () => {
    expect(validateConnection("asset", "imageGen", "reference")).toBe(true);
    expect(validateConnection("imageGen", "imageGen", "reference")).toBe(true);
    expect(validateConnection("prompt", "imageGen", "reference")).toBe(false);
  });

  it("allows prompt and image references to feed video generation nodes", () => {
    expect(validateConnection("prompt", "videoGen", "prompt")).toBe(true);
    expect(validateConnection("asset", "videoGen", "reference")).toBe(true);
    expect(validateConnection("imageGen", "videoGen", "reference")).toBe(true);
    expect(validateConnection("prompt", "videoGen", "reference")).toBe(false);
  });
});

describe("generation input resolution", () => {
  it("combines upstream and local prompts and carries reference assets", () => {
    const nodes: Node<CanvasNodeData>[] = [
      { id: "prompt", type: "prompt", position: { x: 0, y: 0 }, data: { prompt: "upstream prompt" } },
      { id: "asset", type: "asset", position: { x: 0, y: 0 }, data: { assetId: "asset-1", assetUrl: "/asset.png" } },
      { id: "gen", type: "imageGen", position: { x: 0, y: 0 }, data: { prompt: "local prompt" } }
    ];
    const edges: Edge[] = [
      { id: "e1", source: "prompt", target: "gen", targetHandle: "prompt" },
      { id: "e2", source: "asset", target: "gen", targetHandle: "reference" }
    ];

    expect(resolveGenerationInputs(nodes, edges, "gen")).toEqual({
      prompt: "upstream prompt\nlocal prompt",
      referenceAssetId: "asset-1",
      referenceAssetUrl: "/asset.png"
    });
  });

  it("combines multiple upstream prompt nodes in connection order", () => {
    const nodes: Node<CanvasNodeData>[] = [
      { id: "prompt-a", type: "prompt", position: { x: 0, y: 0 }, data: { prompt: "first prompt" } },
      { id: "prompt-b", type: "prompt", position: { x: 0, y: 0 }, data: { prompt: "second prompt" } },
      { id: "gen", type: "imageGen", position: { x: 0, y: 0 }, data: { prompt: "local prompt" } }
    ];
    const edges: Edge[] = [
      { id: "e1", source: "prompt-a", target: "gen", targetHandle: "prompt" },
      { id: "e2", source: "prompt-b", target: "gen", targetHandle: "prompt" }
    ];

    expect(resolveGenerationInputs(nodes, edges, "gen").prompt).toBe("first prompt\nsecond prompt\nlocal prompt");
  });
});
