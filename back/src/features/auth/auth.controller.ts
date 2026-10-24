import type { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";
import { codeVerificationSchema, loginSchema, requestVerificationSchema, signupSchema } from "./auth.schema.js";
import { sendSuccess } from "@/lib/response-handler.js";

// リフレッシュトークンのCookie。付けるときと消すときで設定をそろえないと、消えない
const refreshCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
} as const

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export class AuthController {
    constructor(private authService: AuthService) {}

    requestVerification = async (req: Request, res: Response) => {
        const {studentId} = requestVerificationSchema.parse(req.body)
        const data = await this.authService.requestVerification(studentId);
        return sendSuccess(res,data,200);
    }

    verifyCode = async (req: Request, res: Response) => {
        const { code, studentId } = codeVerificationSchema.parse(req.body)
        const data = await this.authService.verifyCode(studentId, code);
        return sendSuccess(res,data,200);
    }

    signup = async (req: Request, res: Response) => {
        const { plainPassword, registrationToken } = signupSchema.parse(req.body)
        const data = await this.authService.signUp(plainPassword, registrationToken);

        // リフレッシュトークンはCookieに隠し、ユーザー情報とアクセストークンだけを返す
        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200)
    }

    login = async (req: Request, res: Response) => {
        const {studentId,plainPassword} = loginSchema.parse(req.body)
        const data = await this.authService.login(studentId,plainPassword)

        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200)
    }

    logout = async (_req: Request, res: Response) => {
        res.clearCookie('refreshToken', refreshCookie);
        return sendSuccess(res, { message: "Logged out successfully" }, 200);
    }

    refreshSession = async (req: Request, res: Response) => {
        const data = await this.authService.refreshSession(req.cookies.refreshToken);

        // 新しいリフレッシュトークンを再度クッキーにセット（回転させる）
        res.cookie('refreshToken', data.refreshToken, { ...refreshCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return sendSuccess(res, { user: data.user, accessToken: data.accessToken }, 200);
    }
}
