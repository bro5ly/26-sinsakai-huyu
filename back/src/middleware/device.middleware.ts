import type { RequestHandler } from "express";
import type { Config } from "@/config.js";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/features/tablet-devices/device-cookie.js";
import type { TabletDeviceService } from "@/features/tablet-devices/tablet-device.service.js";

// タブレットのAPIは、登録された端末からだけ受け付ける(docs/auth.md R-A2。学校の外から、カードの番号だけで借りられないように)。
// 取り消した端末は次の呼び出しから止まる(R-A3)。通ったら、Cookieを付け直して期限を延ばす(D3)
export const createDeviceMiddleware = (devices: TabletDeviceService, config: Config): RequestHandler => async (req, res, next) => {
    const token: unknown = req.cookies?.[DEVICE_COOKIE];
    const device = await devices.authenticate(typeof token === "string" && token !== "" ? token : undefined, new Date());

    res.cookie(DEVICE_COOKIE, token, deviceCookieOptions(config));
    req.device = { id: device.id, name: device.name };
    next();
};
