import type { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";
import { codeVerificationSchema, loginSchema, requestVerificationSchema, signupSchema, studentIdSchema } from "./auth.schema.js";
import { handleError, sendSuccess } from "@/lib/response-handler.js";

export class AuthController {
    // インスタンス変数は小文字に（推奨）
    constructor(private authService: AuthService) {}

    requestVerification = async (req: Request, res: Response) => {
        try {
            const {studentId} = requestVerificationSchema.parse(req.body)           
            const data = await this.authService.requestVerification(studentId);

            return sendSuccess(res,data,200);

        } catch (err: any) {

            return handleError(res,err);
        }
    }

    verifyCode = async (req: Request, res: Response) => {
        try {
            const { code, studentId } = codeVerificationSchema.parse(req.body)
            
            // Service側の定義に合わせて引数の順序を確認してください
            const data = await this.authService.verifyCode(studentId, code);
            return sendSuccess(res,data,200);

        } catch (err: any) {

            return handleError(res,err);
        }
    }

    signup = async (req: Request, res: Response) => {
        try {
            const { plainPassword, registrationToken } = signupSchema.parse(req.body)

            const data = await this.authService.signUp(plainPassword, registrationToken);

            // リフレッシュトークンをクッキーに隠す
            res.cookie('refreshToken', data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
            });

            // ユーザー情報とアクセストークンだけを返す
            return sendSuccess(
                res,
                {
                    user: data.user,
                    accessToken: data.accessToken
                },
                200
            )

        } catch (err: any) {
            return handleError(res,err)
        }
    }

    login = async (req: Request, res: Response) => {
        try {
            const {studentId,plainPassword} = loginSchema.parse(req.body)
            const data = await this.authService.login(studentId,plainPassword)

            // クッキーにセットする処理（signupと同じ）
            res.cookie('refreshToken', data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 
            });


            return sendSuccess(
                res,
                {
                    user: data.user,
                    accessToken: data.accessToken
                },
                200
            )
        } catch (err: any) {
            return handleError(res,err)
        }
    }

    refreshSession = async (req: Request, res: Response) => {
    try {
        // cookie-parserを導入している前提です
        const token = req.cookies.refreshToken;
        // if (!token) throw new AppError('リフレッシュトークンがありません', 401, 'REFRESH_TOKEN_NOT_FOUND');

        const data = await this.authService.refreshSession(token);

        // 新しいリフレッシュトークンを再度クッキーにセット（回転させる）
        res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return sendSuccess(res, {
            user: data.user,
            accessToken: data.accessToken
        }, 200);
    } catch (err: any) {
        return handleError(res, err);
    }
}
}