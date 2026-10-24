// src/lib/response-handler.ts
import type { Response } from "express";

// 成功の応答。包み方({ success, ...data })は docs/api.md の形に移すときにやめる(0.7)。
// 失敗の応答は middleware/error.middleware.ts だけが返す
export const sendSuccess = (res: Response, data: any, status = 200) => {
    return res.status(status).json({ success: true, ...data });
};
