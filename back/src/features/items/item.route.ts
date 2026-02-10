import { Router } from "express";
import { ItemRepository } from "./item.repository.js";
import { prisma } from "@/lib/prisma.js";
import { ItemService } from "./item.service.js";
import { ItemController } from "./item.controller.js";

const router = Router(); // Changed Router to Router() to correctly initialize the router

const itemRepository = new ItemRepository(prisma)
const itemService = new ItemService(itemRepository)
const itemController = new ItemController(itemService)


router.get('/', itemController.getItems);

export default router