import { describe, expect, it } from "vitest";
import {
  afterCodeAttempt,
  afterLoginAttempt,
  CODE_MAX_ATTEMPTS,
  isLoginLocked,
  LOGIN_LOCK_MS,
  LOGIN_MAX_ATTEMPTS,
} from "./attempt.check.js";

const now = new Date("2026-10-29T10:00:00Z");
const minute = 60_000;

describe("isLoginLocked(ログインを止めている間か)", () => {
  describe("正常系", () => {
    it("F1 止めていなければ(いつまでが無い)、止めていない", () => {
      expect(isLoginLocked(null, now)).toBe(false);
    });

    // 正しいパスワードでも断る
    it("F1 止める期限の前なら、止めている", () => {
      expect(isLoginLocked(new Date(now.getTime() + minute), now)).toBe(true);
    });
  });

  describe("境界値", () => {
    // 15分たてば解ける。F3
    it("F1 期限ちょうどになったら、止めていない", () => {
      expect(isLoginLocked(now, now)).toBe(false);
    });

    it("F1 期限の1ミリ秒前は、まだ止めている", () => {
      expect(isLoginLocked(new Date(now.getTime() + 1), now)).toBe(true);
    });
  });
});

describe("afterLoginAttempt(パスワードを比べたあと、回数をどうするか)", () => {
  describe("正常系", () => {
    // 「続けて」の5回なので
    it("F1 合えば、回数を0に戻して通す", () => {
      expect(afterLoginAttempt(3, true, now)).toEqual({ ok: true, failedAttempts: 0, lockedUntil: null });
    });
  });

  describe("異常系", () => {
    // R-16
    it("F1 違えば、回数を1つ足して、学籍番号かパスワードが違うと断る", () => {
      expect(afterLoginAttempt(0, false, now)).toEqual({
        ok: false,
        reason: "INVALID_CREDENTIALS",
        failedAttempts: 1,
        lockedUntil: null,
      });
    });
  });

  describe("境界値", () => {
    it("F1 4回目の間違いまでは、止めない", () => {
      expect(afterLoginAttempt(LOGIN_MAX_ATTEMPTS - 2, false, now)).toMatchObject({
        reason: "INVALID_CREDENTIALS",
        failedAttempts: LOGIN_MAX_ATTEMPTS - 1,
        lockedUntil: null,
      });
    });

    // 待てばよいと分かるように
    it("F1 5回目の間違いで15分止め、回数を0に戻し、その応答から「回数が多すぎます」にする", () => {
      expect(afterLoginAttempt(LOGIN_MAX_ATTEMPTS - 1, false, now)).toEqual({
        ok: false,
        reason: "RATE_LIMITED",
        failedAttempts: 0,
        lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS),
      });
      expect(LOGIN_LOCK_MS).toBe(15 * minute);
    });
  });
});

describe("afterCodeAttempt(認証コードを比べたあと、どうするか)", () => {
  const record = (overrides: Partial<{ expiresAt: Date; tokenHash: string | null; attempts: number }> = {}) => ({
    expiresAt: new Date(now.getTime() + 10 * minute),
    tokenHash: null,
    attempts: 0,
    ...overrides,
  });

  describe("正常系", () => {
    it("R-6 コードが合い、期限内で、まだ使っていなければ通す", () => {
      expect(afterCodeAttempt(record(), true, now)).toEqual({ ok: true });
    });
  });

  describe("異常系", () => {
    it("R-7 申請していなければ断り、何も書かない", () => {
      expect(afterCodeAttempt(null, true, now)).toEqual({ ok: false, action: "none" });
    });

    it("R-7 期限切れなら、コードが合っても断り、回数は数えない", () => {
      expect(afterCodeAttempt(record({ expiresAt: new Date(now.getTime() - 1) }), true, now)).toEqual({
        ok: false,
        action: "none",
      });
    });

    // コードは1回だけ使える
    it("A8-8 もうトークンを出したコードなら、断る", () => {
      expect(afterCodeAttempt(record({ tokenHash: "used" }), true, now)).toEqual({ ok: false, action: "none" });
    });

    it("R-8 コードが違えば、間違えた回数を1つ足して断る", () => {
      expect(afterCodeAttempt(record({ attempts: 1 }), false, now)).toEqual({
        ok: false,
        action: "count",
        attempts: 2,
      });
    });
  });

  describe("境界値", () => {
    it("R-8 4回目の間違いまでは、コードを残す", () => {
      expect(afterCodeAttempt(record({ attempts: CODE_MAX_ATTEMPTS - 2 }), false, now)).toEqual({
        ok: false,
        action: "count",
        attempts: CODE_MAX_ATTEMPTS - 1,
      });
    });

    // 行ごと消し、申請し直させる。Q1
    it("R-8 5回目の間違いで、コードを無効にする", () => {
      expect(afterCodeAttempt(record({ attempts: CODE_MAX_ATTEMPTS - 1 }), false, now)).toEqual({
        ok: false,
        action: "invalidate",
      });
    });

    it("R-8 もう5回間違えた行が残っていたら、合っていても通さずに消す", () => {
      expect(afterCodeAttempt(record({ attempts: CODE_MAX_ATTEMPTS }), true, now)).toEqual({
        ok: false,
        action: "invalidate",
      });
    });

    it("R-7 期限ちょうどは、切れている", () => {
      expect(afterCodeAttempt(record({ expiresAt: now }), true, now)).toEqual({ ok: false, action: "none" });
    });
  });
});
