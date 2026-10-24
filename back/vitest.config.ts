import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json の paths("@/*" → "./src/*")と揃える
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // lib/jwt.ts は読み込まれた瞬間に鍵を読むので、テストのファイルより先に .env を読む(Dockerでは compose が渡した値が優先される)
    setupFiles: ["dotenv/config"],
  },
});
