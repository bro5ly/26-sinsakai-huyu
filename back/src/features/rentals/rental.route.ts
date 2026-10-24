import { Router } from "express";
import { RentalService } from "./rental.service.js";
import { RentalController } from "./rental.controller.js";
import { tabletMiddleware } from "@/middleware/tablet.auth.middleware.js";
import type { Deps } from "@/deps.js";

export const createTabletRoutes = (deps: Deps) => {
    const router = Router()

    const rentalService = new RentalService(deps.rentals, deps.roster)
    const rentalController = new RentalController(rentalService)

    router.post('/signin', rentalController.signinByIc)
    router.post('/checkout',tabletMiddleware, rentalController.checkoutItem)
    router.post('/return',tabletMiddleware, rentalController.returnItem)

    return router
}
