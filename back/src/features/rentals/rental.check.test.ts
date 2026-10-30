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
    // R-20
    it("C8 物品も借りる人も止める理由が無いとき、返却期限を「今 + 貸し出し期間」にして貸し出す", () => {
      expect(canCheckout(item({ rentalPeriodDays: 14 }), borrower(), now)).toEqual({
        ok: true,
        dueDate: new Date(now.getTime() + 14 * day),
      });
    });
  });

  describe("異常系", () => {
    // 1行 = 判断表の1行。C3は、止められている人でも物の理由を先に言うことを見るため、借りる人も止めておく
    it.each([
      {
        row: "C0",
        when: "借りる人がDBにいない(利用者が消された)",
        item: item(),
        borrower: null,
        reason: "UNAUTHENTICATED",
      },
      { row: "C1", when: "物品が無い", item: null, borrower: borrower(), reason: "ITEM_NOT_FOUND" },
      {
        row: "C2",
        when: "修理中",
        item: item({ status: "MAINTENANCE" }),
        borrower: borrower(),
        reason: "ITEM_UNAVAILABLE",
      },
      { row: "C2", when: "紛失", item: item({ status: "LOST" }), borrower: borrower(), reason: "ITEM_UNAVAILABLE" },
      { row: "C2", when: "廃棄", item: item({ status: "DISPOSED" }), borrower: borrower(), reason: "ITEM_UNAVAILABLE" },
      {
        row: "C3",
        when: "貸出中",
        item: item({ hasActiveRental: true }),
        borrower: borrower({ canBorrow: false }),
        reason: "ITEM_ALREADY_RENTED",
      },
      {
        row: "C4",
        when: "貸し出しが止められている",
        item: item(),
        borrower: borrower({ canBorrow: false }),
        reason: "BORROWING_SUSPENDED",
      },
      {
        row: "C5",
        when: "停止期間中",
        item: item(),
        borrower: borrower({ suspendedUntil: new Date(now.getTime() + day) }),
        reason: "BORROWING_SUSPENDED",
      },
      {
        row: "C6",
        when: "返却期限を過ぎた物がある",
        item: item(),
        borrower: borrower({ activeDueDates: [new Date(now.getTime() - day)] }),
        reason: "HAS_OVERDUE",
      },
      {
        row: "C7",
        when: "借りている数が上限",
        item: item(),
        borrower: borrower({ maxItems: 3, activeDueDates: [1, 2, 3].map((n) => new Date(now.getTime() + n * day)) }),
        reason: "LIMIT_REACHED",
      },
    ] as const)("$row $whenのとき、$reason で断る", ({ item, borrower, reason }) => {
      expect(canCheckout(item, borrower, now)).toEqual({ ok: false, reason });
    });
  });

  describe("境界値", () => {
    // 物そのものが使えないことを先に伝える(2026-10-30 B1)
    it("C2 紛失で、貸し出しがまだ返却になっていないとき、貸出中(C3)より先に ITEM_UNAVAILABLE で断る", () => {
      expect(canCheckout(item({ status: "LOST", hasActiveRental: true }), borrower(), now)).toEqual({
        ok: false,
        reason: "ITEM_UNAVAILABLE",
      });
    });

    it("C5 停止期間の終わりちょうどのとき、貸し出す", () => {
      expect(canCheckout(item(), borrower({ suspendedUntil: now }), now).ok).toBe(true);
    });

    // 延滞は期限を過ぎてから(docs/spec.md 6章)
    it("C6 返却期限ちょうどの物があるとき、まだ延滞にせず貸し出す", () => {
      expect(canCheckout(item(), borrower({ activeDueDates: [now] }), now).ok).toBe(true);
    });

    it("C7 借りている数が上限の1つ手前のとき、貸し出す", () => {
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
