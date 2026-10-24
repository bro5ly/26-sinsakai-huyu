import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // shared/ はビルドせずTypeScriptのまま使うので、Next.jsにコンパイルさせる(2026-10-24 P1)
  transpilePackages: ["@sinsakai/shared"],
};

export default nextConfig;
