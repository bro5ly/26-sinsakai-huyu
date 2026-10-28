import { describe, expect, it } from "vitest";
import { hashToken, newToken } from "./session-token.js";

// セッション・登録用トークン・端末の番号に共通で使う(docs/auth.md 2章、A8-5)

describe("newToken(推測できない番号を作る)", () => {
    describe("正常系", () => {
        it("ST1 32バイトの乱数を、URLやCookieにそのまま入れられる文字(base64url)で返す", () => {
            expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
        });

        it("ST2 呼ぶたびに違う番号を返す", () => {
            const tokens = new Set(Array.from({ length: 100 }, () => newToken()));

            expect(tokens.size).toBe(100);
        });
    });
});

describe("hashToken(DBに置くハッシュにする)", () => {
    describe("正常系", () => {
        it("ST3 同じ番号からは同じハッシュ(SHA-256の16進数)を返す。DBで探す鍵にするため", () => {
            expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
            expect(hashToken("abc")).toBe(hashToken("abc"));
        });

        it("ST4 番号そのものは返さない(DBが漏れても、そのままは使えない)", () => {
            const token = newToken();

            expect(hashToken(token)).not.toContain(token);
        });
    });
});
