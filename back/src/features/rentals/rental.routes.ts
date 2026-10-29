import { Router } from "express";
import { RentalService } from "./rental.service.js";
import { rentalSchema } from "./rental.schema.js";
import { tabletMiddleware } from "@/middleware/tablet.auth.middleware.js";
import { route } from "@/lib/route.js";
import { sendSuccess } from "@/lib/response-handler.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";
import { createDeviceMiddleware } from "@/middleware/device.middleware.js";
import { createTabletDeviceService } from "@/features/tablet-devices/tablet-device.routes.js";
import type { CurrentTabletDevice } from "@sinsakai/shared";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createTabletRoutes = (deps: Deps, config: Config) => {
    const router = Router()
    const rentals = new RentalService(deps.rentals, deps.roster)

    // どのタブレットのAPIも、登録された端末からだけ受け付ける(2026-10-29 D5。docs/auth.md R-A2)
    router.use(createDeviceMiddleware(createTabletDeviceService(deps), config))

    // タブレットの画面が開いたときに、登録された端末か(と名前)を確かめる。登録されていなければ401 DEVICE_NOT_REGISTERED
    router.get('/device', route({}, async ({ req, res }) => {
        const device = req.device
        if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない")
        return res.status(200).json({ id: device.id, name: device.name } satisfies CurrentTabletDevice)
    }))

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
