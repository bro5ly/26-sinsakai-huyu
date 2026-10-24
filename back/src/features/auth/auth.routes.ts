import {Router} from "express";
import { rateLimit } from "express-rate-limit";
import { AuthService } from "./auth.service.js";
import { codeVerificationSchema, loginSchema, requestVerificationSchema, signupSchema } from "./auth.schema.js";
import { route } from "@/lib/route.js";
import { sendSuccess } from "@/lib/response-handler.js";
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

    router.post('/request-verification', route({ body: requestVerificationSchema }, async ({ body, res }) => {
        const data = await auth.requestVerification(body.studentId)
        return sendSuccess(res, data, 200)
    }))

    router.post('/verify-code', route({ body: codeVerificationSchema }, async ({ body, res }) => {
        const data = await auth.verifyCode(body.studentId, body.code)
        return sendSuccess(res, data, 200)
    }))

    router.post('/signup', route({ body: signupSchema }, async ({ body, res }) => {
        const data = await auth.signUp(body.plainPassword, body.registrationToken)

        // リフレッシュトークンはCookieに隠し、ユーザー情報とアクセストークンだけを返す
        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: REFRESH_COOKIE_MAX_AGE })
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200)
    }))

    router.post('/login', loginLimiter, route({ body: loginSchema }, async ({ body, res }) => {
        const data = await auth.login(body.studentId, body.plainPassword)

        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: REFRESH_COOKIE_MAX_AGE })
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200)
    }))

    router.post('/logout', route({}, async ({ res }) => {
        res.clearCookie('refreshToken', refreshCookie)
        return sendSuccess(res, { message: "Logged out successfully" }, 200)
    }))

    router.post('/refreshSession', route({}, async ({ req, res }) => {
        const data = await auth.refreshSession(req.cookies.refreshToken)

        // 新しいリフレッシュトークンを再度クッキーにセット（回転させる）
        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: REFRESH_COOKIE_MAX_AGE })
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200)
    }))

    return router
}
