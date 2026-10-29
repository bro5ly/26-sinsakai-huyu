import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json の paths("@/*" → "./src/*")と揃える
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // shared/ にはテストを走らせる道具が無いので、画面とサーバーの共通の判断(PINなど)のテストもここで走らせる
    include: ["src/**/*.test.ts", "../shared/src/**/*.test.ts"],
  },
});
