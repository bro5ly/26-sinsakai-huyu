// src/lib/response-handler.ts
import type { Response } from "express";
import { Prisma } from "@/generated/prisma/client.js"; 
import { AppError } from "./error.js";
import { ZodError } from "zod";

export const sendSuccess = (res: Response, data: any, status = 200) => {
    return res.status(status).json({ success: true, ...data });
};

export const handleError = (res: Response, err: any) => {
    // 1. Zod バリデーションエラーの場合
    if (err instanceof ZodError) {
    // もし型エラーが消えない場合は (err as ZodError).issues を使うのがより正確です
        const zodError = err as ZodError; 
        
        return res.status(400).json({
            message: "入力内容が正しくありません",
            code: "VALIDATION_ERROR",
            // ZodErrorの詳細は 'issues' プロパティに格納されています
            errors: zodError.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
            }))
    });
}
    // 2. 独自エラー (AppError) の場合
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ 
            message: err.message, 
            code: err.code 
        });
    }

    // 3. Prismaエラーの場合
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique制約違反 (例: 同じバーコードを登録しようとした)
        if (err.code === 'P2002') {
            return res.status(409).json({ 
                message: '既に登録されているデータです', 
                code: 'ALREADY_EXISTS',
                target: err.meta?.target 
            });
        }
        // レコードが見つからない (例: 存在しないIDを更新/削除しようとした)
        if (err.code === 'P2025') {
            return res.status(404).json({ 
                message: '指定されたデータが見つかりません', 
                code: 'NOT_FOUND' 
            });
        }
    }

    // 4. 予期せぬエラー（500系）
    console.error("[Unhandled Error]:", err);
    return res.status(500).json({ 
        message: "予期せぬエラーが発生しました", 
        code: "INTERNAL_SERVER_ERROR" 
    });
};