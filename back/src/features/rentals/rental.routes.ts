import { Router } from "express";
import { RentalService } from "./rental.service.js";
import { rentalSchema } from "./rental.schema.js";
import { createTabletSessionMiddleware } from "@/middleware/tablet.auth.middleware.js";
import { TabletSessionService } from "@/features/tablet-sessions/tablet-session.service.js";
import { route } from "@/lib/route.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";
import { createDeviceMiddleware } from "@/middleware/device.middleware.js";
import { createDeviceAttemptLimiter } from "@/lib/rate-limit.js";
import { createTabletDeviceService } from "@/features/tablet-devices/tablet-device.routes.js";
import {
  createTabletSessionRequestSchema,
  type CurrentTabletDevice,
  type Rental,
  type TabletSession,
} from "@sinsakai/shared";
import { toRentalResponse } from "./rental.response.js";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export const createTabletRoutes = (deps: Deps, config: Config) => {
  const router = Router();
  const rentals = new RentalService(deps.rentals);
  const tabletSessions = new TabletSessionService(deps.roster, deps.cardHolders, deps.sessions, deps.me);
  const tabletMiddleware = createTabletSessionMiddleware(tabletSessions);

  // どのタブレットのAPIも、登録された端末からだけ受け付ける(2026-10-29 D5。docs/auth.md R-A2)
  router.use(createDeviceMiddleware(createTabletDeviceService(deps), config));

  // タブレットの画面が開いたときに、登録された端末か(と名前)を確かめる。登録されていなければ401 DEVICE_NOT_REGISTERED
  router.get(
    "/device",
    route({}, async ({ req, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      return res.status(200).json({ id: device.id, name: device.name } satisfies CurrentTabletDevice);
    }),
  );

  // カードとPINで本人確認し、この端末でだけ使えるセッションを作る(UC-8・判断表T)
  router.post(
    "/sessions",
    createDeviceAttemptLimiter(),
    route({ body: createTabletSessionRequestSchema }, async ({ req, body, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      const session = await tabletSessions.start(body, device.id, new Date());
      // 日付は中ではDate、APIの境目でISOの文字列にする(T5)
      return res.status(201).json({
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        user: { displayName: session.displayName },
        rentals: session.rentals.map((rental) => ({ ...rental, dueDate: rental.dueDate.toISOString() })),
      } satisfies TabletSession);
    }),
  );

  // 「終わる」・完了の表示から10秒で、すぐ無効にする(R-A10)。切れていても失敗にしない(何度押してもよい)
  router.delete("/sessions/current", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) await tabletSessions.end(authHeader.slice("Bearer ".length));
    res.status(204).end();
  });

  // 本人確認したセッションで借りる(UC-8・判断表C)。借りた端末を記録する(E3)
  router.post(
    "/rentals",
    tabletMiddleware,
    route({ body: rentalSchema.itemAction, auth: true }, async ({ req, body, user, res }) => {
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
    route({ body: rentalSchema.itemAction }, async ({ req, body, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      const rental = await rentals.returnItem({ barcode: body.barcode, deviceId: device.id }, new Date());
      return res.status(201).json(toRentalResponse(rental) satisfies Rental);
    }),
  );

  return router;
};
