import { Router } from "express";
import { ItemRepository } from "./item.repository.js";
import { prisma } from "@/lib/prisma.js";
import { ItemService } from "./item.service.js";
import { ItemController } from "./item.controller.js";

const router = Router;

const itemRepository = new ItemRepository(prisma)
const itemService = new ItemService(itemRepository)
const itemController = new ItemController(itemService)



export default router