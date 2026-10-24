import { Router } from "express";
import { ItemService } from "./item.service.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import { route } from "@/lib/route.js";
import { sendSuccess } from "@/lib/response-handler.js";
import type { Deps } from "@/deps.js";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createItemRoutes = (deps: Deps) => {
    const router = Router();
    const items = new ItemService(deps.items, deps.roster)

    // 全アイテム取得（認証不要）
    router.get('/', route({}, async ({ res }) => {
        const data = await items.findAll()
        return sendSuccess(res, { data }, 200)
    }))

    // 自分の情報取得（認証必須）
    router.get('/me', authMiddleware, route({ auth: true }, async ({ user, res }) => {
        const data = await items.getMyInfo(user.id)
        return sendSuccess(res, { data }, 200)
    }))

    return router
}
