import { describe, expect, it } from "vitest";
import { itemAvailability, rentalStatus } from "./rental.status.js";

// 決まりは docs/spec.md の6章(延滞 = 未返却で返却期限が今より前)
const now = new Date("2026-10-23T12:00:00.000+09:00");

describe("rentalStatus(貸し出しの状態)", () => {
  describe("正常系", () => {
    // RETURNED
    it("S1 返却日時が入っていれば、返却済み", () => {
      const rental = {
        returnedAt: new Date("2026-10-22T10:00:00.000+09:00"),
        dueDate: new Date("2026-10-24T12:00:00.000+09:00"),
      };
      expect(rentalStatus(rental, now)).toBe("RETURNED");
    });
    // RENTING
    it("S2 未返却で返却期限が明日なら、貸出中", () => {
      const rental = { returnedAt: null, dueDate: new Date("2026-10-24T12:00:00.000+09:00") };
      expect(rentalStatus(rental, now)).toBe("RENTING");
    });
    // OVERDUE
    it("S3 未返却で返却期限が昨日なら、延滞", () => {
      const rental = { returnedAt: null, dueDate: new Date("2026-10-22T12:00:00.000+09:00") };
      expect(rentalStatus(rental, now)).toBe("OVERDUE");
    });
  });
  describe("境界値", () => {
    // RENTING
    it("S4 未返却で返却期限がちょうど今なら、貸出中", () => {
      const rental = { returnedAt: null, dueDate: new Date("2026-10-23T12:00:00.000+09:00") };
      expect(rentalStatus(rental, now)).toBe("RENTING");
    });
    // OVERDUE
    it("S5 未返却で返却期限が今の1ミリ秒前なら、延滞", () => {
      const rental = { returnedAt: null, dueDate: new Date("2026-10-23T11:59:59.999+09:00") };
      expect(rentalStatus(rental, now)).toBe("OVERDUE");
    });
    // RETURNED
    it("S6 返却日時が入っていれば、返却期限を過ぎていても返却済み", () => {
      const rental = {
        returnedAt: new Date("2026-10-23T11:00:00.000+09:00"),
        dueDate: new Date("2026-10-20T12:00:00.000+09:00"),
      };
      expect(rentalStatus(rental, now)).toBe("RETURNED");
    });
  });
});

describe("itemAvailability(物品の状態)", () => {
  describe("正常系", () => {
    // AVAILABLE
    it("I1 使える物で貸出中の記録が無ければ、貸し出し可能", () => {
      expect(itemAvailability("AVAILABLE", false)).toBe("AVAILABLE");
    });
    // RENTED
    it("I2 使える物で貸出中の記録があれば、貸出中", () => {
      expect(itemAvailability("AVAILABLE", true)).toBe("RENTED");
    });
  });
  describe("異常系", () => {
    // MAINTENANCE
    it("I3 修理中なら、貸出中の記録があっても修理中", () => {
      expect(itemAvailability("MAINTENANCE", true)).toBe("MAINTENANCE");
    });
    // LOST・DISPOSED
    it("I4 紛失・廃棄なら、そのまま", () => {
      expect(itemAvailability("LOST", false)).toBe("LOST");
      expect(itemAvailability("DISPOSED", false)).toBe("DISPOSED");
    });
  });
});
