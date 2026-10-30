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
    // 型で守っている決まり(*.test-d.ts)も npm test で確かめる(docs/backlog.md 0.10 TS2)。
    // Vitestはテストを走らせるときに型を確かめないため
    typecheck: { enabled: true, include: ["src/**/*.test-d.ts"], tsconfig: "./tsconfig.json" },
  },
});
