import { describe, expect, it } from "vitest";
import type { SessionRecord } from "@/features/auth/auth.types.js";
import { afterPinAttempt, checkCardHolder, checkTabletSession, PIN_MAX_ATTEMPTS } from "./tablet-session.check.js";
import type { CardHolderRecord } from "./tablet-session.types.js";

const now = new Date("2026-10-29T03:00:00Z");
const sec = 1000;

const holder = (overrides: Partial<CardHolderRecord> = {}): CardHolderRecord => ({
  id: "user-1",
  role: "MEMBER",
  isActive: true,
  pinHash: "hash",
  pinFailedAttempts: 0,
  pinLockedAt: null,
  ...overrides,
});

// 判断表T(docs/auth.md 5章)のうち、PINを比べる前に決まる行。T1(端末)はミドルウェアで先に断っている
describe("checkCardHolder(カードの持ち主でPINを試してよいか)", () => {
  describe("正常系", () => {
    it("T6の前 名簿にいて、登録済み・有効・PIN登録済み・ロックしていなければ、PINを比べに進む", () => {
      expect(checkCardHolder(holder(), true)).toEqual({ ok: true, holder: holder() });
    });
  });

  describe("異常系", () => {
    it("T2 カードが名簿に無い・登録していない・無効な人なら、「カードかPINが違います」(どれかは言わない。R-A12・R-A14)", () => {
      expect(checkCardHolder(holder(), false)).toEqual({ ok: false, reason: "INVALID_CARD_OR_PIN" });
      expect(checkCardHolder(null, true)).toEqual({ ok: false, reason: "INVALID_CARD_OR_PIN" });
      expect(checkCardHolder(holder({ isActive: false }), true)).toEqual({ ok: false, reason: "INVALID_CARD_OR_PIN" });
    });

    it("T3 PINを登録していなければ、T2と同じく「カードかPINが違います」(A-Q3)", () => {
      expect(checkCardHolder(holder({ pinHash: null }), true)).toEqual({ ok: false, reason: "INVALID_CARD_OR_PIN" });
    });

    it("T4 PINがロック中なら、PIN_LOCKED(Webで登録し直すまで解けない。R-A7)", () => {
      expect(checkCardHolder(holder({ pinLockedAt: now }), true)).toEqual({ ok: false, reason: "PIN_LOCKED" });
    });
  });
});

describe("afterPinAttempt(PINを比べた結果で、間違えた回数とロックを決める)", () => {
  describe("正常系", () => {
    it("T6 PINが合えば、間違えた回数を0に戻す", () => {
      expect(afterPinAttempt(3, true, now)).toEqual({ ok: true, failedAttempts: 0 });
    });
  });

  describe("異常系", () => {
    it("T5 PINが違えば、回数を1つ足して「カードかPINが違います」", () => {
      expect(afterPinAttempt(0, false, now)).toEqual({
        ok: false,
        reason: "INVALID_CARD_OR_PIN",
        failedAttempts: 1,
        lockedAt: null,
      });
    });
  });

  describe("境界値", () => {
    it("T5 4回目の間違いまでは、ロックしない", () => {
      expect(afterPinAttempt(3, false, now)).toMatchObject({
        failedAttempts: 4,
        lockedAt: null,
        reason: "INVALID_CARD_OR_PIN",
      });
    });

    it("T5 5回目の間違いでロックし、その応答からPIN_LOCKEDにする(R-A7・E5)", () => {
      expect(PIN_MAX_ATTEMPTS).toBe(5);
      expect(afterPinAttempt(4, false, now)).toEqual({
        ok: false,
        reason: "PIN_LOCKED",
        failedAttempts: 5,
        lockedAt: now,
      });
    });
  });
});

const session = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  kind: "TABLET",
  expiresAt: new Date(now.getTime() + 60 * sec),
  createdAt: new Date(now.getTime() - 60 * sec),
  lastUsedAt: new Date(now.getTime() - 10 * sec),
  deviceId: "device-1",
  user: { id: "user-1", role: "MEMBER", isActive: true },
  ...overrides,
});

// タブレットのセッション(docs/auth.md R-A8〜A11): その端末でだけ、無操作30秒・作ってから3分まで
describe("checkTabletSession(タブレットのセッションで通してよいか)", () => {
  describe("正常系", () => {
    it("TS1 同じ端末で、30秒以内に使っていて、3分以内なら、通す", () => {
      expect(checkTabletSession(session(), "device-1", now)).toEqual({
        ok: true,
        user: { id: "user-1", role: "MEMBER" },
      });
    });

    it("TS2 まだ一度も使っていなければ、作った日時から30秒を数える", () => {
      expect(
        checkTabletSession(
          session({ lastUsedAt: null, createdAt: new Date(now.getTime() - 10 * sec) }),
          "device-1",
          now,
        ).ok,
      ).toBe(true);
    });
  });

  describe("異常系", () => {
    it("TS3 セッションが無い・Webのセッション・別の端末で作ったセッションなら、UNAUTHENTICATED(R-A8・R-A18)", () => {
      expect(checkTabletSession(null, "device-1", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
      expect(checkTabletSession(session({ kind: "WEB" }), "device-1", now)).toEqual({
        ok: false,
        reason: "UNAUTHENTICATED",
      });
      expect(checkTabletSession(session(), "device-2", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
    });

    it("TS4 無効な人なら、UNAUTHENTICATED(R-A14)", () => {
      expect(
        checkTabletSession(session({ user: { id: "user-1", role: "MEMBER", isActive: false } }), "device-1", now),
      ).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
    });
  });

  describe("境界値", () => {
    it("TS5 最後に使ってからちょうど30秒なら、切れている(SESSION_EXPIRED。R-A9)", () => {
      expect(checkTabletSession(session({ lastUsedAt: new Date(now.getTime() - 30 * sec) }), "device-1", now)).toEqual({
        ok: false,
        reason: "SESSION_EXPIRED",
      });
    });

    it("TS6 最後に使ってから30秒の1ミリ秒前なら、通す", () => {
      expect(
        checkTabletSession(session({ lastUsedAt: new Date(now.getTime() - 30 * sec + 1) }), "device-1", now).ok,
      ).toBe(true);
    });

    it("TS7 操作中でも、作ってから3分(期限ちょうど)なら、切れている(SESSION_EXPIRED。R-A9)", () => {
      expect(checkTabletSession(session({ expiresAt: now, lastUsedAt: now }), "device-1", now)).toEqual({
        ok: false,
        reason: "SESSION_EXPIRED",
      });
    });
  });
});
