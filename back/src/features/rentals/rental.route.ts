import { Router } from "express";
import { RentalRepository } from "./rental.repository.js";
import { prisma } from "@/lib/prisma.js";
import { RentalService } from "./rental.service.js";
import { RentalController } from "./rental.controller.js";
import { tabletMiddleware } from "@/middleware/tablet.auth.middleware.js";

const router = Router()

const rentalRepository = new RentalRepository(prisma)
const rentalService = new RentalService(rentalRepository)
const rentalController = new RentalController(rentalService)

router.post('/signin', rentalController.signinByIc)
router.post('/checkout',tabletMiddleware, rentalController.checkoutItem)
router.post('/return',tabletMiddleware, rentalController.returnItem)

export default router