import type { SessionRecord } from "@/features/auth/auth.types.js";
import type { CardHolderRecord } from "./tablet-session.types.js";

// 続けて間違えたらロックする回数(docs/auth.md R-A7・A-Q3)
export const PIN_MAX_ATTEMPTS = 5;
// タブレットのセッション: 無操作で切れるまで(R-A9・A-Q5)。作ってから切れるまでの3分は、作るときに expiresAt に入れる
export const TABLET_IDLE_MS = 30 * 1000;
export const TABLET_SESSION_MS = 3 * 60 * 1000;

export type CardHolderCheck =
  | { ok: true; holder: CardHolderRecord & { pinHash: string } }
  | { ok: false; reason: "INVALID_CARD_OR_PIN" | "PIN_LOCKED" };

// 判断表T(docs/auth.md 5章)のうち、PINを比べる前に決まる行。
// 名簿に無い・登録していない・無効な人・PIN未登録は、どれも同じ理由で断る(カードが有効かを知られないため。R-A12・A-Q3)
export const checkCardHolder = (holder: CardHolderRecord | null, inRoster: boolean): CardHolderCheck => {
  if (!inRoster || !holder || !holder.isActive || holder.pinHash === null)
    return { ok: false, reason: "INVALID_CARD_OR_PIN" };
  if (holder.pinLockedAt) return { ok: false, reason: "PIN_LOCKED" };
  return { ok: true, holder: { ...holder, pinHash: holder.pinHash } };
};

export type PinAttemptResult =
  | { ok: true; failedAttempts: 0 }
  | { ok: false; reason: "INVALID_CARD_OR_PIN" | "PIN_LOCKED"; failedAttempts: number; lockedAt: Date | null };

// 判断表TのT5・T6。5回目の間違いでロックし、その応答からPIN_LOCKEDにする(次にすることが分かるように。E5)
export const afterPinAttempt = (failedAttempts: number, matched: boolean, now: Date): PinAttemptResult => {
  if (matched) return { ok: true, failedAttempts: 0 };
  const next = failedAttempts + 1;
  return next >= PIN_MAX_ATTEMPTS
    ? { ok: false, reason: "PIN_LOCKED", failedAttempts: next, lockedAt: now }
    : { ok: false, reason: "INVALID_CARD_OR_PIN", failedAttempts: next, lockedAt: null };
};

export type TabletSessionCheck =
  | { ok: true; user: { id: string; role: SessionRecord["user"]["role"] } }
  | { ok: false; reason: "UNAUTHENTICATED" | "SESSION_EXPIRED" };

// タブレットのセッションで通してよいか(R-A8〜A11)。時間切れは「もう一度カードを読んでください」(SESSION_EXPIRED)、
// それ以外(無い・Webのもの・別の端末・無効な人)はログインしていない扱いにする
export const checkTabletSession = (session: SessionRecord | null, deviceId: string, now: Date): TabletSessionCheck => {
  if (!session || session.kind !== "TABLET" || session.deviceId !== deviceId || !session.user.isActive) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }
  const lastUsedAt = session.lastUsedAt ?? session.createdAt;
  if (now >= session.expiresAt || now.getTime() - lastUsedAt.getTime() >= TABLET_IDLE_MS)
    return { ok: false, reason: "SESSION_EXPIRED" };
  return { ok: true, user: { id: session.user.id, role: session.user.role } };
};
