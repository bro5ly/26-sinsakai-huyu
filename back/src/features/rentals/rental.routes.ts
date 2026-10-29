import { Router } from "express";
import { tabletItemRequestSchema, type Rental } from "@sinsakai/shared";
import type { Deps } from "@/deps.js";
import { createTabletSessionService } from "@/features/tablet-sessions/tablet-session.routes.js";
import { route } from "@/lib/route.js";
import { createTabletSessionMiddleware } from "@/middleware/tablet.auth.middleware.js";
import { toRentalResponse } from "./rental.response.js";
import { RentalService } from "./rental.service.js";

export const createRentalService = (deps: Deps): RentalService => new RentalService({ rentals: deps.rentals });

// /api/tablet の下。入口の createDeviceMiddleware が、登録された端末かを先に確かめてある(routes/index.ts。D5)
export const createRentalRoutes = (deps: Deps): Router => {
  const router = Router();
  const rentals = createRentalService(deps);
  const tabletSession = createTabletSessionMiddleware(createTabletSessionService(deps));

  // 本人確認したセッションで借りる(UC-8・判断表C)。借りた端末を記録する(E3)
  router.post(
    "/rentals",
    tabletSession,
    route({ body: tabletItemRequestSchema, auth: true }, async ({ req, body, user, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      const rental = await rentals.checkout(
        { userId: user.id, barcode: body.barcode, deviceId: device.id },
        new Date(),
      );
      return res.status(201).json(toRentalResponse(rental) satisfies Rental);
    }),
  );

  // 返却は、登録された端末であれば、カードもPINも要らない(返すのは本人でなくてよい。A-Q4・E7)。返した端末を記録する(E3)
  router.post(
    "/returns",
    route({ body: tabletItemRequestSchema }, async ({ req, body, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      const rental = await rentals.returnItem({ barcode: body.barcode, deviceId: device.id }, new Date());
      return res.status(201).json(toRentalResponse(rental) satisfies Rental);
    }),
  );

  return router;
};
