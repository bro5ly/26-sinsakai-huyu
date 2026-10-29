import { z } from "zod";

// .env.example の「MAIL_HOST=」のような空の値は、書いていないのと同じに扱う
const optionalString = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());
const requiredString = z.preprocess((v) => (v === "" ? undefined : v), z.string());

// 既定の値は、まとめる前に各ファイルが使っていた値のまま(2026-10-24 G3)
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5454),
    FRONTEND_URL: z.string().default("http://localhost:4545"),
    DATABASE_URL: requiredString,
    MAIL_HOST: optionalString,
    MAIL_PORT: z.coerce.number().int().positive().default(2525),
    MAIL_USER: optionalString,
    MAIL_PASS: optionalString,
    MAIL_FROM: z.string().default('"図書管理システム" <noreply@example.com>'),
});

export type Config = {
    nodeEnv: "development" | "production" | "test";
    port: number;
    frontendUrl: string;
    databaseUrl: string;
    mail: { host: string | undefined; port: number; user: string | undefined; pass: string | undefined; from: string };
};

// 環境変数を読むのはここだけ。足りない・形が違うときは、最初のリクエストではなく起動のときに止める(docs/backlog.md 0.7 G1)
export const loadConfig = (env: Record<string, string | undefined>): Config => {
    const result = envSchema.safeParse(env);
    if (!result.success) {
        // 値は秘密の鍵のこともあるので、名前だけを出す
        const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
        throw new Error(`環境変数が足りないか、形が違います: ${names.join(", ")}(back/.env.example を見てください)`);
    }
    const e = result.data;
    return {
        nodeEnv: e.NODE_ENV,
        port: e.PORT,
        frontendUrl: e.FRONTEND_URL,
        databaseUrl: e.DATABASE_URL,
        mail: { host: e.MAIL_HOST, port: e.MAIL_PORT, user: e.MAIL_USER, pass: e.MAIL_PASS, from: e.MAIL_FROM },
    };
};

let cached: Config | undefined;

// server.ts が起動のときに1回だけ読む。ほかの所は buildDeps(config)・createApp(deps, config) から受け取る(G1・G2)
export const getConfig = (): Config => (cached ??= loadConfig(process.env));
