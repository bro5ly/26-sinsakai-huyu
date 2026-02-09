import type {Request,Response,NextFunction } from "express";
import { verifyTabletToken } from '@/lib/jwt.js'
import { AppError } from "@/lib/error.js";

export const tabletMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1]
        if (!authHeader?.startsWith('Bearer ') || !token) {
            throw new AppError('認証トークンが必要です', 401, 'TOKEN_REQUIRED');
        }
        const decoded = verifyTabletToken(token) as {sub: string, role: string}

        req.user = {
            id: decoded.sub,
            role: decoded.role
        }

        next();

    } catch (err: any) {
        const message = err.message === 'TABLET_SESSION_EXPIRED_OR_INVALID' 
            ? 'セッションの期限が切れました' 
            : '認証に失敗しました';
        
        next(new AppError(message, 401, 'INVALID_TOKEN'));
    }
}