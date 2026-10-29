import { Router } from "express";
import { setPinRequestSchema, type Me, type MyRentals } from "@sinsakai/shared";
import { createPasswordFailureLimiter } from "@/lib/rate-limit.js";
import { createAuthMiddleware } from "@/middleware/auth.middleware.js";
import { route } from "@/lib/route.js";
import type { Deps } from "@/deps.js";
import { MeService } from "./me.service.js";
import type { MeView, RentalView } from "./me.types.js";

// 日付は中ではDate、APIの境目でISOの文字列にする(T5)
const toMe = (me: MeView): Me => ({
    ...me,
    borrowing: { ...me.borrowing, suspendedUntil: me.borrowing.suspendedUntil?.toISOString() ?? null },
});
const toRental = (rental: RentalView): MyRentals["items"][number] => ({
    ...rental,
    rentedAt: rental.rentedAt.toISOString(),
    dueDate: rental.dueDate.toISOString(),
    returnedAt: rental.returnedAt?.toISOString() ?? null,
});

// ログイン中の本人(docs/api.md 4.2)。どちらもWebのセッションが要る
export const createMeRoutes = (deps: Deps) => {
    const router = Router();
    const me = new MeService(deps.me, deps.roster);

    router.use(createAuthMiddleware(deps.sessions));

    router.get("/", route({ auth: true }, async ({ user, res }) => {
        return res.status(200).json(toMe(await me.getMe(user.id, new Date())) satisfies Me);
    }));

    // 今は借りている物だけ。返した物の履歴(?state=all)は、履歴の画面を作るときに足す(2026-10-25 Me4)
    router.get("/rentals", route({ auth: true }, async ({ user, res }) => {
        const rentals = await me.getMyRentals(user.id, new Date());
        return res.status(200).json({ items: rentals.map(toRental) } satisfies MyRentals);
    }));

    // パスワードを入れ直させるので、ログインと同じく失敗の回数を制限する(ログインしたまま離れた人の画面から、何度でも試せないように。P6)
    router.put("/pin", createPasswordFailureLimiter(), route({ auth: true, body: setPinRequestSchema }, async ({ user, body, res }) => {
        await me.setPin(user.id, body);
        return res.status(204).end();
    }));

    return router;
};
