import type { RequestHandler } from "express";
import * as jwtLib from "@/lib/jwt.js";
import { DomainError } from "@/lib/domain-error.js";

// Authorization: Bearer <アクセストークン> を確かめ、req.user に入れる
export const authMiddleware: RequestHandler = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    if (!token) throw new DomainError("UNAUTHENTICATED");

    let decoded: { sub: string; role: string };
    try {
        decoded = jwtLib.verifyAccessToken(token) as { sub: string; role: string };
    } catch {
        // 期限切れ・改ざん・壊れたトークン。画面はリフレッシュしてやり直す
        throw new DomainError("UNAUTHENTICATED");
    }

    req.user = { id: decoded.sub, role: decoded.role };
    next();
};
