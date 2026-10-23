import { Router } from "express";
import { ItemRepository } from "./item.repository.js";
import { prisma } from "@/lib/prisma.js";
import { ItemService } from "./item.service.js";
import { ItemController } from "./item.controller.js";
import { authMiddleware } from "@/middleware/auth.middleware.js";
import { PrismaRoster } from "../roster/prisma-roster.js";

const router = Router();

const itemRepository = new ItemRepository(prisma)
const itemService = new ItemService(itemRepository, new PrismaRoster(prisma))
const itemController = new ItemController(itemService)

// 全アイテム取得（認証不要）
router.get('/', itemController.getItems);

// 自分の情報取得（認証必須）
router.get('/me', authMiddleware, itemController.getMyInfo);

export default router