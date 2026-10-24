import { Router } from "express";
import { ItemService } from "./item.service.js";
import { ItemController } from "./item.controller.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import type { Deps } from "@/deps.js";

export const createItemRoutes = (deps: Deps) => {
    const router = Router();

    const itemService = new ItemService(deps.items, deps.roster)
    const itemController = new ItemController(itemService)

    // 全アイテム取得（認証不要）
    router.get('/', itemController.getItems);

    // 自分の情報取得（認証必須）
    router.get('/me', authMiddleware, itemController.getMyInfo);

    return router
}
