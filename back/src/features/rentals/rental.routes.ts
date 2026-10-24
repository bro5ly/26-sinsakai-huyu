import { Router } from "express";
import { RentalService } from "./rental.service.js";
import { rentalSchema } from "./rental.schema.js";
import { tabletMiddleware } from "@/middleware/tablet.auth.middleware.js";
import { route } from "@/lib/route.js";
import { sendSuccess } from "@/lib/response-handler.js";
import type { Deps } from "@/deps.js";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createTabletRoutes = (deps: Deps) => {
    const router = Router()
    const rentals = new RentalService(deps.rentals, deps.roster)

    router.post('/signin', route({ body: rentalSchema.signin }, async ({ body, res }) => {
        const result = await rentals.signInWithIc(body.serialNumber)
        return sendSuccess(res, result, 200)
    }))

    router.post('/checkout', tabletMiddleware, route({ body: rentalSchema.itemAction, auth: true }, async ({ body, user, res }) => {
        const result = await rentals.checkoutItem(user.id, body.barcode)
        return sendSuccess(res, result, 200)
    }))

    router.post('/return', tabletMiddleware, route({ body: rentalSchema.itemAction }, async ({ body, res }) => {
        const result = await rentals.returnItem(body.barcode)
        return sendSuccess(res, result, 200)
    }))

    return router
}
