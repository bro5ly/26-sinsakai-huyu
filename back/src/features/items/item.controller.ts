import type { ItemService } from "./item.service.js";
import type { Request, Response } from "express";
import { handleError, sendSuccess } from "@/lib/response-handler.js";
import { AppError } from "@/lib/error.js";

export class ItemController {
    constructor(private itemService: ItemService) { }

    // 全アイテム取得
    getItems = async (req: Request, res: Response) => {
        try {
            const items = await this.itemService.findAll();
            return sendSuccess(res, { data: items }, 200);
        } catch (err: any) {
            return handleError(res, err);
        }
    }

    // 自分の情報取得（認証必須）
    getMyInfo = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
            }

            const data = await this.itemService.getMyInfo(userId);
            return sendSuccess(res, { data }, 200);
        } catch (err: any) {
            return handleError(res, err);
        }
    }
}