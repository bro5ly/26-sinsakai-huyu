import { itemAvailability, rentalStatus } from "./rental.status.js";
import type { BorrowerRecord, CheckoutItemRecord } from "./rental.types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CheckoutCheck =
    | { ok: true; dueDate: Date }
    | {
          ok: false;
          reason: "UNAUTHENTICATED" | "ITEM_NOT_FOUND" | "ITEM_ALREADY_RENTED" | "ITEM_UNAVAILABLE" | "BORROWING_SUSPENDED" | "HAS_OVERDUE" | "LIMIT_REACHED";
      };

// 判断表C(docs/spec.md 6章)。上から順に見て、最初に当てはまった行の結果になる。
// 物の理由(C1〜C3)を先に、借りる人の理由(C4〜C7)を後に言う
export const canCheckout = (item: CheckoutItemRecord | null, borrower: BorrowerRecord | null, now: Date): CheckoutCheck => {
    if (!borrower) return { ok: false, reason: "UNAUTHENTICATED" };
    if (!item) return { ok: false, reason: "ITEM_NOT_FOUND" };

    const availability = itemAvailability(item.status, item.hasActiveRental);
    if (availability === "RENTED") return { ok: false, reason: "ITEM_ALREADY_RENTED" };
    if (availability !== "AVAILABLE") return { ok: false, reason: "ITEM_UNAVAILABLE" };

    // 止められている人と停止期間中は、同じ理由で断る(E8)
    if (!borrower.canBorrow || (borrower.suspendedUntil && now < borrower.suspendedUntil)) return { ok: false, reason: "BORROWING_SUSPENDED" };
    // 延滞は、返却期限から決める(延滞の状態を書く処理は無い。Q6)
    if (borrower.activeDueDates.some((dueDate) => rentalStatus({ returnedAt: null, dueDate }, now) === "OVERDUE")) return { ok: false, reason: "HAS_OVERDUE" };
    if (borrower.activeDueDates.length >= borrower.maxItems) return { ok: false, reason: "LIMIT_REACHED" };

    return { ok: true, dueDate: new Date(now.getTime() + item.rentalPeriodDays * DAY_MS) };
};
