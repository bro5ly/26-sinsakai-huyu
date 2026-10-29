import { describe, expect, it } from "vitest";
import { canCheckout } from "./rental.check.js";
import type { BorrowerRecord, CheckoutItemRecord } from "./rental.types.js";

const now = new Date("2026-10-29T03:00:00Z");
const day = 86_400_000;

const item = (overrides: Partial<CheckoutItemRecord> = {}): CheckoutItemRecord => ({
  id: "item-2",
  status: "AVAILABLE",
  hasActiveRental: false,
  rentalPeriodDays: 7,
  ...overrides,
});
const borrower = (overrides: Partial<BorrowerRecord> = {}): BorrowerRecord => ({
  canBorrow: true,
  maxItems: 3,
  suspendedUntil: null,
  activeDueDates: [],
  ...overrides,
});

// 判断表C(docs/spec.md 6章)。上から順に見て、最初に当てはまった行の結果になる
describe("canCheckout(貸し出せるか)", () => {
  describe("正常系", () => {
    it("C8 物品が貸し出せて、借りる人に止める理由が無ければ、返却期限を「今 + その種類の貸し出し期間」にして貸し出す(R-20)", () => {
      expect(canCheckout(item({ rentalPeriodDays: 14 }), borrower(), now)).toEqual({
        ok: true,
        dueDate: new Date(now.getTime() + 14 * day),
      });
    });
  });

  describe("異常系", () => {
    it("C1 物品が無ければ、ITEM_NOT_FOUND", () => {
      expect(canCheckout(null, borrower(), now)).toEqual({ ok: false, reason: "ITEM_NOT_FOUND" });
    });

    it("C2 貸出中なら、ITEM_ALREADY_RENTED(止められている人でも、物の理由を先に言う)", () => {
      expect(canCheckout(item({ hasActiveRental: true }), borrower({ canBorrow: false }), now)).toEqual({
        ok: false,
        reason: "ITEM_ALREADY_RENTED",
      });
    });

    it("C3 修理中・紛失・廃棄なら、ITEM_UNAVAILABLE", () => {
      for (const status of ["MAINTENANCE", "LOST", "DISPOSED"] as const) {
        expect(canCheckout(item({ status }), borrower(), now)).toEqual({ ok: false, reason: "ITEM_UNAVAILABLE" });
      }
    });

    it("C4 借りる人の貸し出しが止められていれば、BORROWING_SUSPENDED(R-A15)", () => {
      expect(canCheckout(item(), borrower({ canBorrow: false }), now)).toEqual({
        ok: false,
        reason: "BORROWING_SUSPENDED",
      });
    });

    it("C5 停止期間中なら、C4と同じ BORROWING_SUSPENDED(いつまでかはダッシュボードで見る。E8)", () => {
      expect(canCheckout(item(), borrower({ suspendedUntil: new Date(now.getTime() + day) }), now)).toEqual({
        ok: false,
        reason: "BORROWING_SUSPENDED",
      });
    });

    it("C6 返却期限を過ぎた物があれば、HAS_OVERDUE(Q6)", () => {
      expect(canCheckout(item(), borrower({ activeDueDates: [new Date(now.getTime() - day)] }), now)).toEqual({
        ok: false,
        reason: "HAS_OVERDUE",
      });
    });

    it("C7 借りている数が上限に達していれば、LIMIT_REACHED", () => {
      const dueDates = [1, 2, 3].map((n) => new Date(now.getTime() + n * day));
      expect(canCheckout(item(), borrower({ maxItems: 3, activeDueDates: dueDates }), now)).toEqual({
        ok: false,
        reason: "LIMIT_REACHED",
      });
    });

    it("C0 借りる人がDBにいなければ、UNAUTHENTICATED(セッションは正しくても、利用者が消されていることがある)", () => {
      expect(canCheckout(item(), null, now)).toEqual({ ok: false, reason: "UNAUTHENTICATED" });
    });
  });

  describe("境界値", () => {
    it("C5 停止期間の終わりちょうどの時刻からは、貸し出せる", () => {
      expect(canCheckout(item(), borrower({ suspendedUntil: now }), now).ok).toBe(true);
    });

    it("C6 返却期限ちょうどの物は、まだ延滞にしない(期限を過ぎてから。docs/spec.md 6章)", () => {
      expect(canCheckout(item(), borrower({ activeDueDates: [now] }), now).ok).toBe(true);
    });

    it("C7 上限の1つ手前までは、貸し出せる", () => {
      expect(
        canCheckout(
          item(),
          borrower({ maxItems: 3, activeDueDates: [new Date(now.getTime() + day), new Date(now.getTime() + 2 * day)] }),
          now,
        ).ok,
      ).toBe(true);
    });
  });
});
