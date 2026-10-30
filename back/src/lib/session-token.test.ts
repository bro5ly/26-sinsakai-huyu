import { describe, expect, it } from "vitest";
import { hashToken, newCode, newToken, sameHash } from "./session-token.js";

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

    // DBが漏れても、そのままは使えない
    it("ST4 番号そのものは返さない", () => {
      const token = newToken();

      expect(hashToken(token)).not.toContain(token);
    });
  });
});

describe("sameHash(ハッシュどうしを比べる)", () => {
  describe("正常系", () => {
    it("ST5 同じ番号のハッシュなら合う", () => {
      expect(sameHash(hashToken("123456"), hashToken("123456"))).toBe(true);
    });
  });

  describe("異常系", () => {
    it("ST6 違う番号のハッシュなら合わない", () => {
      expect(sameHash(hashToken("123456"), hashToken("654321"))).toBe(false);
    });
  });

  describe("境界値", () => {
    // timingSafeEqualは長さが違うと投げるため
    it("ST7 長さが違っても例外にせず、合わないとする", () => {
      expect(sameHash(hashToken("123456"), "ab")).toBe(false);
    });
  });
});

describe("newCode(認証コードを作る)", () => {
  describe("正常系", () => {
    // R-4
    it("ST8 6桁の数字を返す", () => {
      expect(newCode()).toMatch(/^\d{6}$/);
    });
  });

  describe("境界値", () => {
    // 000123を123にしない
    it("ST9 頭が0の番号も6桁のまま返す", () => {
      const codes = Array.from({ length: 2000 }, () => newCode());

      expect(codes.every((code) => code.length === 6)).toBe(true);
      expect(codes.some((code) => code.startsWith("0"))).toBe(true);
    });
  });
});
