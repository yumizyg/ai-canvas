export type GenerateImageParams = {
  prompt: string;
  negativePrompt?: string;
  size: string;
  aspectRatio?: string;
  resolution?: string;
  width?: number;
  height?: number;
  seed?: number;
  count?: number;
  referenceAssetUrl?: string;
  modelSlug?: string;
};

export type GenerateVideoParams = GenerateImageParams & {
  duration?: number;
  fps?: number;
};

export type GeneratedAsset = {
  mimeType: string;
  data: Buffer;
  width?: number;
  height?: number;
};

export type GeneratedImage = GeneratedAsset;
export type GeneratedVideo = GeneratedAsset;

export interface ModelProviderAdapter {
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
  generateVideo?(params: GenerateVideoParams): Promise<GeneratedVideo>;
}
