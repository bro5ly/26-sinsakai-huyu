import { Router } from "express";
import { createTabletSessionRequestSchema, type TabletSession } from "@sinsakai/shared";
import type { Deps } from "@/deps.js";
import { createDeviceAttemptLimiter } from "@/lib/rate-limit.js";
import { route } from "@/lib/route.js";
import { TabletSessionService } from "./tablet-session.service.js";

// 別の機能(貸し出しの入口のミドルウェア)でも同じ組み立てを使う
export const createTabletSessionService = (deps: Deps): TabletSessionService =>
  new TabletSessionService({
    roster: deps.roster,
    cardHolders: deps.cardHolders,
    sessions: deps.sessions,
    rentals: deps.me,
    passwords: deps.passwords,
    secrets: deps.secrets,
  });

// /api/tablet の下。入口の createDeviceMiddleware が、登録された端末かを先に確かめてある(routes/index.ts。D5)
export const createTabletSessionRoutes = (deps: Deps): Router => {
  const router = Router();
  const tabletSessions = createTabletSessionService(deps);

  // カードとPINで本人確認し、この端末でだけ使えるセッションを作る(UC-8・判断表T)
  router.post(
    "/sessions",
    createDeviceAttemptLimiter(),
    route({ body: createTabletSessionRequestSchema }, async ({ req, body, res }) => {
      const device = req.device;
      if (!device) throw new Error("createDeviceMiddleware の後でしか呼ばれない");
      const session = await tabletSessions.start({ ...body, deviceId: device.id }, new Date());
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

  return router;
};
