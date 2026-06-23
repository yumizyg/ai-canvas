const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const basePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

export function appPath(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (basePath && (normalized === basePath || normalized.startsWith(`${basePath}/`))) {
    return normalized;
  }
  return `${basePath}${normalized}`;
}
