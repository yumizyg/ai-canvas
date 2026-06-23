const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  ...(basePath ? { basePath } : {})
};

export default nextConfig;
