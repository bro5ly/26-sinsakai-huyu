import { describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { RentalService, type RentalStore } from "./rental.service.js";

// 登録済みの利用者(このシステムのDB側)。名前などは持たない
const registered = { id: "user-3", studentId: "20240003", rentals: [] };

const store = (overrides: Partial<RentalStore> = {}): RentalStore => ({
    findUserWithActiveRentals: async (studentId) => (studentId === registered.studentId ? registered : null),
    findByBarcode: notUsed,
    saveCheckout: notUsed,
    saveReturned: notUsed,
    ...overrides,
});

describe("signInWithIc(カードの番号で本人確認する)", () => {
    it("R1 カードの番号が名簿にあり登録済みなら、名簿の名前・学年・専攻で返す", async () => {
        const service = new RentalService(store(), new FakeRoster([rosterEntry()]));

        const result = await service.signInWithIc("IC-CARD-003");

        expect(result.user).toEqual({ id: "user-3", studentId: "20240003", name: "鈴木 次郎", grade: "1年", major: "機械工学科" });
        expect(result.data).toEqual([]);
        expect(typeof result.session).toBe("string");
    });

    it("R2 カードの番号が名簿に無いなら、断る(AUTH_FAILED)", async () => {
        const service = new RentalService(store(), new FakeRoster([rosterEntry()]));

        await expect(service.signInWithIc("IC-CARD-999")).rejects.toMatchObject({ statusCode: 401, code: "AUTH_FAILED" });
    });

    it("R3 名簿にはいるが登録していないなら、断る(AUTH_FAILED)", async () => {
        const unregistered = rosterEntry({ studentId: "20260001", serialNumber: "SN-001" });
        const service = new RentalService(store(), new FakeRoster([rosterEntry(), unregistered]));

        await expect(service.signInWithIc("SN-001")).rejects.toMatchObject({ statusCode: 401, code: "AUTH_FAILED" });
    });
});
