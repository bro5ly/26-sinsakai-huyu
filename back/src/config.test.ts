import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

// 本物の process.env は使わず、テストごとに環境変数の組を渡す
const required = {
    DATABASE_URL: "postgresql://postgres:postgres@db:5432/test",
};

describe("loadConfig(環境変数を起動のときに1回だけ読む)", () => {
    describe("正常系", () => {
        it("N1 必須の値がそろえば、型の付いた設定を返す(数字は数字にする)", () => {
            const config = loadConfig({
                ...required,
                NODE_ENV: "production",
                PORT: "8080",
                FRONTEND_URL: "https://example.com",
                MAIL_HOST: "smtp.example.com",
                MAIL_PORT: "587",
                MAIL_USER: "user",
                MAIL_PASS: "pass",
                MAIL_FROM: "テスト <test@example.com>",
            });

            expect(config).toEqual({
                nodeEnv: "production",
                port: 8080,
                frontendUrl: "https://example.com",
                databaseUrl: required.DATABASE_URL,
                mail: { host: "smtp.example.com", port: 587, user: "user", pass: "pass", from: "テスト <test@example.com>" },
            });
        });

        it("N2 既定の値があるもの(NODE_ENV・PORT・FRONTEND_URL・MAIL_PORT・MAIL_FROM)は、無ければ今の既定の値にする(G3)", () => {
            const config = loadConfig(required);

            expect(config).toMatchObject({
                nodeEnv: "development",
                port: 5454,
                frontendUrl: "http://localhost:4545",
                mail: { host: undefined, port: 2525, user: undefined, pass: undefined, from: '"図書管理システム" <noreply@example.com>' },
            });
        });
    });

    describe("異常系", () => {
        it("N3 必須の値が無ければ、足りない名前をすべて挙げて投げる(サーバーを立ち上げない)", () => {
            expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
        });

        it("N4 投げるときに、環境変数の値(秘密の鍵など)を文に出さない", () => {
            const secret = "do-not-leak-this-secret";

            expect(() => loadConfig({ ...required, DATABASE_URL: secret, PORT: "not-a-number" })).toThrow(
                expect.objectContaining({ message: expect.not.stringContaining(secret) }),
            );
        });

        it("N5 PORTが数字でなければ、投げる", () => {
            expect(() => loadConfig({ ...required, PORT: "abc" })).toThrow(/PORT/);
        });

        it("N6 NODE_ENVが決まった値(development・production・test)でなければ、投げる", () => {
            expect(() => loadConfig({ ...required, NODE_ENV: "prod" })).toThrow(/NODE_ENV/);
        });
    });

    describe("境界値", () => {
        it("N7 必須の値が空の文字列なら、無いのと同じに扱って投げる(.env.example の「DATABASE_URL=」のまま)", () => {
            expect(() => loadConfig({ ...required, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
        });

        it("N8 メールの値が空の文字列なら、無いのと同じに扱う(空のままでも起動できる。.env.example)", () => {
            const config = loadConfig({ ...required, MAIL_HOST: "", MAIL_USER: "", MAIL_PASS: "" });

            expect(config.mail).toMatchObject({ host: undefined, user: undefined, pass: undefined });
        });
    });
});
