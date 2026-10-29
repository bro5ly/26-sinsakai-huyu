import type { SessionRecord } from "./auth.types.js";

export type SessionCheck =
  { ok: true; user: { id: string; role: SessionRecord["user"]["role"] } } | { ok: false; reason: "UNAUTHENTICATED" };

// セッションで通してよいか。どの理由で断ったかは言わない(無効な人かどうかを知られないため。R-A14)。
// 名簿はここでは見ない(本番は学校のDBかAPIで、毎回読むのは重い。ログインのときに見る。A8-10)
export const checkSession = (session: SessionRecord | null, kind: SessionRecord["kind"], now: Date): SessionCheck => {
  if (!session) return { ok: false, reason: "UNAUTHENTICATED" };
  if (now >= session.expiresAt) return { ok: false, reason: "UNAUTHENTICATED" };
  if (session.kind !== kind) return { ok: false, reason: "UNAUTHENTICATED" };
  if (!session.user.isActive) return { ok: false, reason: "UNAUTHENTICATED" };
  return { ok: true, user: { id: session.user.id, role: session.user.role } };
};
