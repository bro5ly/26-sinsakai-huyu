import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { DomainError } from "./domain-error.js";

// パスワードの総当たりを遅くする。数はdocs/auth.md 4.6(接続元ごとに15分で20回。C5)。
// 学校の回線では全員が同じ接続元に見えるので、成功したリクエストは数えない(2026-10-24 K9-B。学籍番号ごとの制限は0.8のf)。
// 接続元はreq.ipで見分ける。間にプロキシを置くまでは trust proxy を設定しない(L2)。
// 呼ぶたびに数え直す(テストのappどうしで回数が混ざらないように)。数はメモリに持つので、APIが1台のときだけ正しい
export const createPasswordFailureLimiter = (): RequestHandler =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 20,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        // ライブラリの呼び出しの中なので、throwではなくnextでエラー用のミドルウェアに渡す
        handler: (_req, _res, next) => next(new DomainError("RATE_LIMITED")),
    });
