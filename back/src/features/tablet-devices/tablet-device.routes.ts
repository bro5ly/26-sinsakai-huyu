import { Router } from "express";
import { registerTabletDeviceRequestSchema, type TabletDevice, type TabletDevices } from "@sinsakai/shared";
import { route } from "@/lib/route.js";
import { createPasswordFailureLimiter } from "@/lib/rate-limit.js";
import { createAuthService } from "@/features/auth/auth.routes.js";
import type { Deps } from "@/deps.js";
import type { Config } from "@/config.js";
import { DEVICE_COOKIE, deviceCookieOptions } from "./device-cookie.js";
import { TabletDeviceService } from "./tablet-device.service.js";
import type { TabletDeviceRecord } from "./tablet-device.types.js";

// 日付は中ではDate、APIの境目でISOの文字列にする(T5)
const toTabletDevice = (device: TabletDeviceRecord): TabletDevice => ({
  id: device.id,
  name: device.name,
  createdAt: device.createdAt.toISOString(),
  lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
});

// 別の機能(タブレットのAPIの入口)でも同じ組み立てを使う
export const createTabletDeviceService = (deps: Deps): TabletDeviceService =>
  new TabletDeviceService({ devices: deps.devices, credentials: createAuthService(deps), secrets: deps.secrets });

// 置くタブレットの上での登録(UC-20)。管理者のWebのセッションは使わず、本文の学籍番号とパスワードでその場で確かめるので、
// /api/admin(Webのセッションのある管理者だけ)の外に置く(2026-10-29 D1・D2)
export const createTabletDeviceRoutes = (deps: Deps, config: Config) => {
  const router = Router();
  const devices = createTabletDeviceService(deps);

  router.post(
    "/tablet-devices",
    createPasswordFailureLimiter(),
    route({ body: registerTabletDeviceRequestSchema }, async ({ body, res }) => {
      const { device, token } = await devices.register(body, new Date());
      // 番号はCookieにだけ入れ、本文には入れない
      res.cookie(DEVICE_COOKIE, token, deviceCookieOptions(config));
      return res.status(201).json(toTabletDevice(device) satisfies TabletDevice);
    }),
  );

  return router;
};

// 管理者がWebで使う一覧と取り消し(UC-20)。/api/admin の入口で、Webのセッションと管理者かを確かめてある(D1)
export const createAdminTabletDeviceRoutes = (deps: Deps) => {
  const router = Router();
  const devices = createTabletDeviceService(deps);

  router.get(
    "/tablet-devices",
    route({}, async ({ res }) => {
      return res.status(200).json({ items: (await devices.list()).map(toTabletDevice) } satisfies TabletDevices);
    }),
  );

  router.delete(
    "/tablet-devices/:id",
    route({}, async ({ req, res }) => {
      await devices.revoke(String(req.params.id), new Date());
      return res.status(204).end();
    }),
  );

  return router;
};
