import type { GenerateImageParams, GeneratedImage, ModelProviderAdapter } from "./types";

export class MockImageProvider implements ModelProviderAdapter {
  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    const [width, height] = params.size.split("x").map((part) => Number(part));
    const safeWidth = params.width ?? (Number.isFinite(width) ? width : 1024);
    const safeHeight = params.height ?? (Number.isFinite(height) ? height : 1024);
    const title = escapeXml(params.prompt.slice(0, 80) || "AI Canvas Mock");
    const seed = params.seed ?? Math.floor(Date.now() / 1000);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1458c8"/>
      <stop offset="48%" stop-color="#16a085"/>
      <stop offset="100%" stop-color="#f0b429"/>
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <circle cx="${safeWidth * 0.78}" cy="${safeHeight * 0.22}" r="${Math.min(safeWidth, safeHeight) * 0.16}" fill="rgba(255,255,255,0.24)"/>
  <rect x="${safeWidth * 0.09}" y="${safeHeight * 0.16}" width="${safeWidth * 0.62}" height="${safeHeight * 0.62}" rx="28" fill="rgba(255,255,255,0.86)"/>
  <text x="${safeWidth * 0.14}" y="${safeHeight * 0.28}" font-family="Arial, sans-serif" font-size="${Math.max(26, safeWidth * 0.04)}" font-weight="700" fill="#172033">Mock Generated Asset</text>
  <text x="${safeWidth * 0.14}" y="${safeHeight * 0.38}" font-family="Arial, sans-serif" font-size="${Math.max(18, safeWidth * 0.024)}" fill="#344054">${title}</text>
  <text x="${safeWidth * 0.14}" y="${safeHeight * 0.48}" font-family="Arial, sans-serif" font-size="${Math.max(16, safeWidth * 0.02)}" fill="#667085">size ${safeWidth}x${safeHeight} · seed ${seed}</text>
</svg>`;
    return {
      mimeType: "image/svg+xml",
      data: Buffer.from(svg),
      width: safeWidth,
      height: safeHeight
    };
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      "\"": "&quot;"
    };
    return entities[char];
  });
}
