import type { ItemService } from "./item.service.js";
import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response-handler.js";
import { DomainError } from "@/lib/domain-error.js";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export class ItemController {
    constructor(private itemService: ItemService) { }

    // 全アイテム取得
    getItems = async (_req: Request, res: Response) => {
        const items = await this.itemService.findAll();
        return sendSuccess(res, { data: items }, 200);
    }

    // 自分の情報取得（認証必須）
    getMyInfo = async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) throw new DomainError('UNAUTHENTICATED');

        const data = await this.itemService.getMyInfo(userId);
        return sendSuccess(res, { data }, 200);
    }
}
