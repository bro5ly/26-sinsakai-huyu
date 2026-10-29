import type { RequestHandler } from "express";
import { DomainError } from "@/lib/domain-error.js";
import type { TabletSessionService } from "@/features/tablet-sessions/tablet-session.service.js";

// タブレットのセッション(カード + PINで作ったもの)を Authorization: Bearer で受け取り、DBで確かめて req.user に入れる。
// 端末の確かめ(createDeviceMiddleware)の後に付ける。作った端末でだけ、無操作30秒・3分まで通す(docs/auth.md R-A8・R-A9)。
// 時間切れは SESSION_EXPIRED、それ以外は UNAUTHENTICATED
export const createTabletSessionMiddleware =
  (sessions: TabletSessionService): RequestHandler =>
  async (req, _res, next) => {
    const device = req.device;
    if (!device) throw new DomainError("DEVICE_NOT_REGISTERED");
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    req.user = await sessions.authenticate(token || undefined, device.id, new Date());
    next();
  };
