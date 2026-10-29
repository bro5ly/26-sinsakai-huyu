import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // page.dev.tsx は開発のときだけページにする(/barcodes。本番のビルドには値を入れない。2026-10-29 BC2)
  pageExtensions: process.env.NODE_ENV === "production" ? ["tsx", "ts", "jsx", "js"] : ["dev.tsx", "tsx", "ts", "jsx", "js"],
  // shared/ はビルドせずTypeScriptのまま使うので、Next.jsにコンパイルさせる(2026-10-24 P1)
  transpilePackages: ["@sinsakai/shared"],
};

export default nextConfig;
