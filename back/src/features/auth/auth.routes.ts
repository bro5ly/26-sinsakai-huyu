import {Router, type Response} from "express";
import { AuthService, WEB_SESSION_DAYS } from "./auth.service.js";
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
import { createCodeRequestLimiter, createPasswordFailureLimiter } from "@/lib/rate-limit.js";
import type { Deps } from "@/deps.js";
import { SESSION_COOKIE } from "@/middleware/auth.middleware.js";
import type { Config } from "@/config.js";

// Cookieの期限は、DBのセッションの期限(7日。A8-6)とそろえる
const SESSION_COOKIE_MAX_AGE = WEB_SESSION_DAYS * 24 * 60 * 60 * 1000

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createAuthRoutes = (deps: Deps, config: Config) => {
    const router = Router();
    // ログインの失敗の回数の制限(P6でPINの変更と同じものにした)
    const loginLimiter = createPasswordFailureLimiter()
    // セッションのCookie。JSから読めず(HttpOnly)、ほかのサイトからのリクエストには付かない(SameSite=Strict。A8-7)。
    // 付けるときと消すときで設定をそろえないと、消えない
    const sessionCookie = {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/',
    } as const
    const auth = new AuthService(deps.users, deps.auth, deps.sessions, deps.mailer, deps.roster)

    // 応答の本文はshared/の形で返す。セッションの番号はCookieにだけ入れ、本文には入れない(JSに渡さない。A8-3)
    const sendSession = (res: Response, data: AuthResult) => {
        res.cookie(SESSION_COOKIE, data.sessionToken, { ...sessionCookie, maxAge: SESSION_COOKIE_MAX_AGE })
        return res.status(201).json({ user: data.user } satisfies Session)
    }

    // 名簿にいてもいなくても同じ202を返す(学籍番号があるか・登録済みかを知られないため。R-16)
    router.post('/verification-codes', createCodeRequestLimiter(), route({ body: verificationCodeRequestSchema }, async ({ body, res }) => {
        await auth.requestVerification(body.studentId, new Date())
        return res.status(202).end()
    }))

    router.post('/verification-tokens', route({ body: verificationTokenRequestSchema }, async ({ body, res }) => {
        const data = await auth.verifyCode(body.studentId, body.code, new Date())
        // 日付は中ではDate、APIの境目でISOの文字列にする(T5)
        return res.status(201).json({ token: data.token, expiresAt: data.expiresAt.toISOString() } satisfies VerificationToken)
    }))

    router.post('/users', route({ body: createUserRequestSchema }, async ({ body, res }) => {
        return sendSession(res, await auth.signUp(body.password, body.token, new Date()))
    }))

    router.post('/sessions', loginLimiter, route({ body: createSessionRequestSchema }, async ({ body, res }) => {
        return sendSession(res, await auth.login(body.studentId, body.password, new Date()))
    }))

    router.delete('/sessions/current', route({}, async ({ req, res }) => {
        await auth.logout(req.cookies?.[SESSION_COOKIE])
        res.clearCookie(SESSION_COOKIE, sessionCookie)
        return res.status(204).end()
    }))

    return router
}
