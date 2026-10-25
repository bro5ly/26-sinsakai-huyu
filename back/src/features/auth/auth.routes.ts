import {Router, type Response} from "express";
import { rateLimit } from "express-rate-limit";
import { AuthService } from "./auth.service.js";
import {
    createSessionRequestSchema,
    createUserRequestSchema,
    verificationCodeRequestSchema,
    verificationTokenRequestSchema,
    type Session,
    type VerificationToken,
} from "@sinsakai/shared";
import type { AuthResult } from "./auth.types.js";
import { route } from "@/lib/route.js";
import { DomainError } from "@/lib/domain-error.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

// パスワードの総当たりを遅くする。数はdocs/auth.md 4.6(接続元ごとに15分で20回。C5)。
// 学校の回線では全員が同じ接続元に見えるので、成功したログインは数えない(2026-10-24 K9-B。学籍番号ごとの制限は0.8)。
// 接続元はreq.ipで見分ける。間にプロキシを置くまでは trust proxy を設定しない(L2)
const loginLimit = { windowMs: 15 * 60 * 1000, limit: 20 }

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createAuthRoutes = (deps: Deps, config: Config) => {
    const router = Router();
    // createAuthRoutesごとに数え直す(テストのappどうしで回数が混ざらないように)。数はメモリに持つので、APIが1台のときだけ正しい
    const loginLimiter = rateLimit({
        ...loginLimit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        // ライブラリの呼び出しの中なので、throwではなくnextでエラー用のミドルウェアに渡す
        handler: (_req, _res, next) => next(new DomainError('RATE_LIMITED')),
    })
    // リフレッシュトークンのCookie。付けるときと消すときで設定をそろえないと、消えない
    const refreshCookie = {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/',
    } as const
    const auth = new AuthService(deps.users, deps.auth, deps.mailer, deps.roster)

    // 応答の本文はshared/の形で返す。リフレッシュトークンはCookieにだけ入れ、本文には入れない
    const sendSession = (res: Response, status: 200 | 201, data: AuthResult) => {
        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: REFRESH_COOKIE_MAX_AGE })
        return res.status(status).json({ user: data.user, accessToken: data.accessToken } satisfies Session)
    }

    // 名簿にいてもいなくても同じ202を返す(学籍番号があるか・登録済みかを知られないため。R-16)
    router.post('/verification-codes', route({ body: verificationCodeRequestSchema }, async ({ body, res }) => {
        await auth.requestVerification(body.studentId)
        return res.status(202).end()
    }))

    router.post('/verification-tokens', route({ body: verificationTokenRequestSchema }, async ({ body, res }) => {
        const data = await auth.verifyCode(body.studentId, body.code)
        // 日付は中ではDate、APIの境目でISOの文字列にする(T5)
        return res.status(201).json({ token: data.token, expiresAt: data.expiresAt.toISOString() } satisfies VerificationToken)
    }))

    router.post('/users', route({ body: createUserRequestSchema }, async ({ body, res }) => {
        return sendSession(res, 201, await auth.signUp(body.password, body.token))
    }))

    router.post('/sessions', loginLimiter, route({ body: createSessionRequestSchema }, async ({ body, res }) => {
        return sendSession(res, 201, await auth.login(body.studentId, body.password))
    }))

    // リフレッシュトークンを入れ替える(回転させる)。新しいセッションを作るのではないので200
    router.post('/sessions/refresh', route({}, async ({ req, res }) => {
        return sendSession(res, 200, await auth.refreshSession(req.cookies.refreshToken))
    }))

    router.delete('/sessions/current', route({}, async ({ req, res }) => {
        await auth.logout(req.cookies.refreshToken)
        res.clearCookie('refreshToken', refreshCookie)
        return res.status(204).end()
    }))

    return router
}
