import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export function getAssetStorageDir() {
  return path.resolve(process.env.ASSET_STORAGE_DIR ?? "./storage/assets");
}

export async function writeAssetFile(id: string, mimeType: string, data: Buffer) {
  const ext = mimeType.includes("svg") ? "svg" : mimeType.includes("png") ? "png" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "bin";
  const dir = getAssetStorageDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.${ext}`);
  await writeFile(filePath, data);
  return filePath;
}
