import type { RequestHandler } from "express";
import { verifyTabletToken } from "@/lib/jwt.js";
import { DomainError } from "@/lib/domain-error.js";

// タブレット用のトークンを確かめ、req.user に入れる。期限切れはSESSION_EXPIRED、それ以外はUNAUTHENTICATED(verifyTabletTokenが投げる)
export const tabletMiddleware: RequestHandler = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    if (!token) throw new DomainError("UNAUTHENTICATED");

    const decoded = verifyTabletToken(token) as { sub: string; role: string };
    req.user = { id: decoded.sub, role: decoded.role };
    next();
};
