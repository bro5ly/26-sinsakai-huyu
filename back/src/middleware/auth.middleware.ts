import type { RequestHandler } from "express";
import { DomainError } from "@/lib/domain-error.js";
import { hashToken } from "@/lib/session-token.js";
import { checkSession } from "@/features/auth/session.check.js";
import type { SessionStore } from "@/features/auth/auth.types.js";

// Webのセッションの番号を入れるCookie。付けるとき(auth.routes.ts)と読むときで名前をそろえる
export const SESSION_COOKIE = "session";

// Cookieのセッションの番号を、DBのセッションと照らして確かめ、req.user に入れる(docs/auth.md 2章、A8-3)。
// 毎回DBを読むので、ログアウト・管理者の取り消し・無効にした人(R-A14)は次のリクエストから止まる
export const createAuthMiddleware = (sessions: SessionStore): RequestHandler => async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || token === "") throw new DomainError("UNAUTHENTICATED");

    const result = checkSession(await sessions.findByTokenHash(hashToken(token)), "WEB", new Date());
    if (!result.ok) throw new DomainError(result.reason);

    req.user = result.user;
    next();
};
