import { describe, expect, it } from "vitest";
import { checkSession } from "./session.check.js";
import type { SessionRecord } from "./auth.types.js";

const now = new Date("2026-10-28T03:00:00Z");

const session = (overrides: Partial<SessionRecord> = {}, user: Partial<SessionRecord["user"]> = {}): SessionRecord => ({
    kind: "WEB",
    expiresAt: new Date(now.getTime() + 60_000),
    createdAt: new Date(now.getTime() - 60_000),
    deviceId: null,
    lastUsedAt: null,
    ...overrides,
    user: { id: "user-1", role: "MEMBER", isActive: true, ...user },
});

// 上から順に見て、最初に当てはまった行の結果になる(docs/auth.md 2章、R-A14・R-A18、A8-6・A8-10)
describe("checkSession(セッションで通してよいか)", () => {
    describe("正常系", () => {
        it("S1 期限内・種類が合う・有効な人なら、利用者のIDと権限を返す", () => {
            expect(checkSession(session({}, { role: "ADMIN" }), "WEB", now)).toEqual({ ok: true, user: { id: "user-1", role: "ADMIN" } });
        });
    });

    describe("異常系", () => {
        it("S2 セッションが無ければ(ログアウト済み・でたらめな番号)、断る(UNAUTHENTICATED)", () => {
            expect(checkSession(null, "WEB", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
        });

        it("S3 期限が切れていれば、断る(UNAUTHENTICATED。A8-6)", () => {
            expect(checkSession(session({ expiresAt: new Date(now.getTime() - 1) }), "WEB", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
        });

        it("S4 種類が違えば(タブレットのセッションでWebを使う)、断る(UNAUTHENTICATED。R-A18)", () => {
            expect(checkSession(session({ kind: "TABLET" }), "WEB", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
        });

        it("S5 無効な人(is_active = false)なら、期限内でも断る(UNAUTHENTICATED。R-A14・A8-10)", () => {
            expect(checkSession(session({}, { isActive: false }), "WEB", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
        });
    });

    describe("境界値", () => {
        it("S6 期限ちょうどの時刻は、切れている扱いにする", () => {
            expect(checkSession(session({ expiresAt: now }), "WEB", now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
        });

        it("S7 期限の1ミリ秒前は、通す", () => {
            expect(checkSession(session({ expiresAt: new Date(now.getTime() + 1) }), "WEB", now).ok).toBe(true);
        });
    });
});
