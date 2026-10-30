import { describe, expect, it } from "vitest";
import { notUsed } from "@/test/fake-roster.js";
import { RentalService } from "./rental.service.js";
import type {
  BorrowerRecord,
  CheckoutItemRecord,
  NewRental,
  RentalRecord,
  RentalReturn,
  RentalStore,
} from "./rental.types.js";

const now = new Date("2026-10-29T03:00:00Z");
const day = 86_400_000;

const item: CheckoutItemRecord = { id: "item-2", status: "AVAILABLE", hasActiveRental: false, rentalPeriodDays: 7 };
const borrower: BorrowerRecord = { canBorrow: true, maxItems: 3, suspendedUntil: null, activeDueDates: [] };
const rental = (overrides: Partial<RentalRecord> = {}): RentalRecord => ({
  id: "rental-1",
  rentedAt: now,
  dueDate: new Date(now.getTime() + 7 * day),
  returnedAt: null,
  item: { id: "item-2" },
  itemType: { id: "type-1", title: "MacBook", genre: { id: "genre-1", name: "ノートパソコン" } },
  ...overrides,
});

const store = (overrides: Partial<RentalStore> = {}): RentalStore => ({
  findCheckoutItemByBarcode: async (barcode) => (barcode === "MAC-002" ? item : null),
  findBorrowerById: async (userId) => (userId === "user-1" ? borrower : null),
  createRental: notUsed,
  saveReturnByBarcode: notUsed,
  ...overrides,
});

type Created = NewRental;
const rentalService = (rentals: RentalStore) => new RentalService({ rentals });

type Returned = RentalReturn;

describe("checkout(タブレットで借りる)", () => {
  describe("正常系", () => {
    it("RS1 判断表Cで貸し出せれば、返却期限と借りた端末を付けて記録し、状態付きで返す(R-19・R-20・E3)", async () => {
      const created: Created[] = [];
      const service = rentalService(
        store({ createRental: async (data) => (created.push(data), rental({ dueDate: data.dueDate })) }),
      );

      const result = await service.checkout({ userId: "user-1", barcode: "MAC-002", deviceId: "device-1" }, now);

      expect(created).toEqual([
        {
          itemId: "item-2",
          userId: "user-1",
          dueDate: new Date(now.getTime() + 7 * day),
          rentedAt: now,
          deviceId: "device-1",
        },
      ]);
      expect(result).toMatchObject({ id: "rental-1", state: "RENTING" });
    });
  });

  describe("異常系", () => {
    it("RS2 判断表Cで断られたら、記録せずにその理由で断る(C1・C6など)", async () => {
      const overdue = store({
        findBorrowerById: async () => ({ ...borrower, activeDueDates: [new Date(now.getTime() - day)] }),
        createRental: notUsed,
      });

      await expect(
        rentalService(store({ createRental: notUsed })).checkout(
          { userId: "user-1", barcode: "NOPE-001", deviceId: "device-1" },
          now,
        ),
      ).rejects.toMatchObject({ code: "ITEM_NOT_FOUND" });
      await expect(
        rentalService(overdue).checkout({ userId: "user-1", barcode: "MAC-002", deviceId: "device-1" }, now),
      ).rejects.toMatchObject({ code: "HAS_OVERDUE" });
    });

    it("RS5 同時に借りられて記録がぶつかったら(repositoryが null を返す)、ITEM_ALREADY_RENTED で断る(0.9 D2)", async () => {
      const service = rentalService(store({ createRental: async () => null }));

      await expect(
        service.checkout({ userId: "user-1", barcode: "MAC-002", deviceId: "device-1" }, now),
      ).rejects.toMatchObject({ code: "ITEM_ALREADY_RENTED" });
    });
  });
});

describe("returnItem(タブレットで返す)", () => {
  describe("正常系", () => {
    it("RS3 返していない貸し出しがあれば、返却日時と返した端末を付けて返却済みにし、状態付きで返す(R-22・A-Q4・E3)", async () => {
      const returned: Returned[] = [];
      const service = rentalService(
        store({ saveReturnByBarcode: async (data) => (returned.push(data), rental({ returnedAt: data.returnedAt })) }),
      );

      const result = await service.returnItem({ barcode: "MAC-002", deviceId: "device-1" }, now);

      expect(returned).toEqual([{ barcode: "MAC-002", returnedAt: now, deviceId: "device-1" }]);
      expect(result).toMatchObject({ returnedAt: now, state: "RETURNED" });
    });
  });

  describe("異常系", () => {
    it("RS4 その物品の返していない貸し出しが無ければ、ACTIVE_RENTAL_NOT_FOUND(R-23)", async () => {
      const service = rentalService(store({ saveReturnByBarcode: async () => null }));

      await expect(service.returnItem({ barcode: "MAC-003", deviceId: "device-1" }, now)).rejects.toMatchObject({
        code: "ACTIVE_RENTAL_NOT_FOUND",
      });
    });
  });
});
