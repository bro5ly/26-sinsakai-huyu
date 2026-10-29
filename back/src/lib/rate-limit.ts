import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { DomainError } from "./domain-error.js";

// 総当たりのうち、メモリで数える分(docs/auth.md 4.6)。数はメモリに持つので、APIが1台のときだけ正しい。
// 呼ぶたびに数え直す(テストのappどうしで回数が混ざらないように)。DBの回数で数える分は features/auth/attempt.check.ts

const minute = 60 * 1000;

// ライブラリの呼び出しの中なので、throwではなくnextでエラー用のミドルウェアに渡す
const limiter = (options: {
  windowMs: number;
  limit: number;
  key?: (req: Request) => string;
  failuresOnly?: boolean;
}): RequestHandler =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: options.failuresOnly ?? false,
    ...(options.key ? { keyGenerator: options.key } : {}),
    handler: (_req, _res, next) => next(new DomainError("RATE_LIMITED")),
  });

// パスワードを受け取るAPI(ログイン・PINの変更・端末の登録)の、接続元ごとの失敗の回数。
// 学籍番号ごとのロック(F1)があるので、ここは「たくさんの学籍番号を順に試す」のを止める役だけ。学校の回線では全員が同じ接続元に
// 見えるので、成功は数えず(K9-B)、数も多めにする(2026-10-29 F2。NIST 800-63Bの「続けての失敗は100回まで」を目安に。本番の置き方で決め直す)。
// 接続元はreq.ipで見分ける。間にプロキシを置くまでは trust proxy を設定しない(L2)
export const PASSWORD_FAILURE_LIMIT = 100;
export const createPasswordFailureLimiter = (): RequestHandler =>
  limiter({ windowMs: 15 * minute, limit: PASSWORD_FAILURE_LIMIT, failuresOnly: true });

// 認証コードの申請は、学籍番号ごとに1分に1回・1時間に5回まで(R-5・docs/auth.md 4.6)。メールを何通も送らせないため。
// 名簿にいない番号も同じに数える(DBで数えると、名簿にいない番号だけ429にならず、名簿にいるかが分かってしまう。F5)
const byStudentId = (req: Request): string => {
  const body: unknown = req.body;
  const studentId = typeof body === "object" && body !== null && "studentId" in body ? body.studentId : undefined;
  return typeof studentId === "string" ? studentId : "";
};
export const createCodeRequestLimiter = (): RequestHandler[] => [
  limiter({ windowMs: minute, limit: 1, key: byStudentId }),
  limiter({ windowMs: 60 * minute, limit: 5, key: byStudentId }),
];

// タブレットのカードとPINは、端末ごとに1分で失敗20回まで(docs/auth.md 4.6)。PINのロック(カードごとに5回)より先に、
// 1台で多くのカードを試すのを止める。混む時間でも普通に借りる人は止めないように、成功は数えない。
// createDeviceMiddleware の後に付ける(req.device が要る)
export const createDeviceAttemptLimiter = (): RequestHandler =>
  limiter({ windowMs: minute, limit: 20, key: (req) => req.device?.id ?? "", failuresOnly: true });
