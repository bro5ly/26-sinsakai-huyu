import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

// APIのリント(docs/backlog.md 0.9 S3)。書式はPrettierに任せ、ここでは書き方の決まりを見る
export default defineConfig([
  globalIgnores(["src/generated/**", "dist/**"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Expressのエラー用のミドルウェアは引数が4つ要るので、使わない引数は _ で始めて残す
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      // src/ の中は @/ から読む(CLAUDE.md)。機能をまたぐ依存が、パスの長さに隠れないように
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["../*"], message: "src/ の中は @/ から読む(CLAUDE.md のコーディング規約)" }] },
      ],
    },
  },
  {
    // serviceとrepositoryの公開のメソッドと、routesの組み立ての関数は、返す型を書く(0.9 M5)
    files: [
      "src/features/**/*.service.ts",
      "src/features/**/*.repository.ts",
      "src/features/**/*.routes.ts",
      "src/features/roster/*.ts",
    ],
    rules: { "@typescript-eslint/explicit-module-boundary-types": "error" },
  },
  // 整形と重なる規則を切る。最後に置く(eslint-config-prettier の README)
  prettier,
]);
