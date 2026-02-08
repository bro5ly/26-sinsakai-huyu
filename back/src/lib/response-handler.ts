// src/lib/response-handler.ts
import type { Response } from "express";
import { Prisma } from "@/generated/prisma/client.js"; 
import { AppError } from "./error.js";

export const sendSuccess = (res: Response, data: any, status = 200) => {
    return res.status(status).json({ success: true, ...data });
};

export const handleError = (res: Response, err: any) => {
    // 1. 独自エラー (AppError) の場合
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message, code: err.code });
    }

    // 2. Prismaエラーの場合
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') { // Unique制約違反
            return res.status(409).json({ message: 'ALREADY_EXISTS', target: err.meta?.target });
        }
    }

    // 3. 予期せぬエラー（500系）
    console.error("[Unhandled Error]:", err);
    return res.status(500).json({ message: "INTERNAL_SERVER_ERROR" });
};