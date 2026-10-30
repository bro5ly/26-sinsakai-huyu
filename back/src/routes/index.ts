import { Router } from "express";
import { createAuthRoutes } from "@/features/auth/auth.routes.js";
import { createCatalogRoutes } from "@/features/catalog/catalog.routes.js";
import { createRentalRoutes } from "@/features/rentals/rental.routes.js";
import { createTabletSessionRoutes } from "@/features/tablet-sessions/tablet-session.routes.js";
import { createDeviceMiddleware } from "@/middleware/device.middleware.js";
import { createMeRoutes } from "@/features/me/me.routes.js";
import {
  createAdminTabletDeviceRoutes,
  createCurrentTabletDeviceRoutes,
  createTabletDeviceRoutes,
  createTabletDeviceService,
} from "@/features/tablet-devices/tablet-device.routes.js";
import { createAuthMiddleware } from "@/middleware/auth.middleware.js";
import { requireAdmin } from "@/middleware/admin.middleware.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";

export const createApiRoutes = (deps: Deps, config: Config): Router => {
  const router = Router();

  // 登録・ログインは資源ごとのURL(/verification-codes・/users・/sessions)を直下に持つ(docs/api.md 4.1)
  router.use(createAuthRoutes(deps, config));
  router.use("/me", createMeRoutes(deps));
  router.use(createCatalogRoutes(deps));
  router.use(createTabletDeviceRoutes(deps, config));

  // タブレットのAPI。入口で1回だけ、登録された端末かを確かめ、req.device に入れる(2026-10-29 D5。docs/auth.md R-A2)
  const tablet = Router();
  tablet.use(createDeviceMiddleware(createTabletDeviceService(deps), config));
  tablet.use(createCurrentTabletDeviceRoutes());
  tablet.use(createTabletSessionRoutes(deps));
  tablet.use(createRentalRoutes(deps));
  router.use("/tablet", tablet);

  // 管理者だけのAPI。入口で1回だけ、Webのセッションと管理者かを確かめる(2026-10-29 D1)
  const admin = Router();
  admin.use(createAuthMiddleware(deps.sessions));
  admin.use(requireAdmin);
  admin.use(createAdminTabletDeviceRoutes(deps));
  router.use("/admin", admin);

  return router;
};
