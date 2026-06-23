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

export type GeneratedImage = {
  mimeType: string;
  data: Buffer;
  width?: number;
  height?: number;
};

export interface ModelProviderAdapter {
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
}
