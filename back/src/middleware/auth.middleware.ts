import type { Request, Response, NextFunction } from "express";
import * as jwtLib from "@/lib/jwt.js";
import { AppError } from "@/lib/error.js";
import { handleError } from "@/lib/response-handler.js";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Authorizationヘッダーを確認 (形式: "Bearer <token>")
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("認証トークンが見つかりません", 401, "UNAUTHORIZED");
        }

        const token = authHeader.split(" ")[1];

        if(!token) throw new AppError("認証トークンが見つかりません", 401, "UNAUTHORIZED");

        // 2. アクセストークンの検証
        // jwtLib.verifyAccessToken は、以前作った payload (sub, role など) を返す想定
        const decoded = jwtLib.verifyAccessToken(token) as { sub: string, role: string };

        // 3. リクエストオブジェクトにユーザー情報を格納
        // これにより、後の Controller で "誰が実行しているか" がわかるようになる
        req.user = {
            id: decoded.sub,
            role: decoded.role
        };

        next(); // 成功！次の処理（Controllerのメソッド）へ進む
    } catch (err: any) {
        // トークン切れや不正なトークンの場合は 401 を返す
        return handleError(res, new AppError("認証に失敗しました", 401, "INVALID_TOKEN"));
    }
};