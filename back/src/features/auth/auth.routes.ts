import {Router} from "express";
import { AuthService } from "./auth.service.js";
import { codeVerificationSchema, loginSchema, requestVerificationSchema, signupSchema } from "./auth.schema.js";
import { route } from "@/lib/route.js";
import { sendSuccess } from "@/lib/response-handler.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createAuthRoutes = (deps: Deps, config: Config) => {
    const router = Router();
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

    router.post('/login', route({ body: loginSchema }, async ({ body, res }) => {
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
