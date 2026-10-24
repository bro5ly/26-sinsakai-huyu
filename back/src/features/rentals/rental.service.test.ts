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
    describe("正常系", () => {
        it("現状: R1 カードの番号が名簿にあり登録済みなら、名簿の名前・学年・専攻で返す(R-17。仕様は表示用の名前だけ: R-A13)", async () => {
            const service = new RentalService(store(), new FakeRoster([rosterEntry()]));

            const result = await service.signInWithIc("IC-CARD-003");

            expect(result.user).toEqual({ id: "user-3", studentId: "20240003", name: "鈴木 次郎", grade: "1年", major: "機械工学科" });
            expect(result.data).toEqual([]);
            expect(typeof result.session).toBe("string");
        });

        it("R4 借りている物があれば、返却期限から決めた状態付きで返す(R-17・R-30)", async () => {
            const rental = (id: string, dueDate: Date) => ({ id, itemId: `item-${id}`, userId: "user-3", rentedAt: new Date(), dueDate, returnedAt: null });
            const withRentals = {
                ...registered,
                rentals: [rental("r1", new Date(Date.now() + 86_400_000)), rental("r2", new Date(Date.now() - 86_400_000))],
            };
            // テストに要る項目だけを持つ形。repository の戻り値の型(物品と種類の中身まで)をすべて作らないため
            const service = new RentalService(store({ findUserWithActiveRentals: async () => withRentals as never }), new FakeRoster([rosterEntry()]));

            const result = await service.signInWithIc("IC-CARD-003");

            expect(result.data.map((r) => [r.id, r.status])).toEqual([
                ["r1", "RENTING"],
                ["r2", "OVERDUE"],
            ]);
        });
    });

    describe("異常系", () => {
        it("R2 カードの番号が名簿に無いなら、断る(INVALID_CARD_OR_PIN)", async () => {
            const service = new RentalService(store(), new FakeRoster([rosterEntry()]));

            await expect(service.signInWithIc("IC-CARD-999")).rejects.toMatchObject({ code: "INVALID_CARD_OR_PIN" });
        });

        it("R3 名簿にはいるが登録していないなら、断る(INVALID_CARD_OR_PIN)", async () => {
            const unregistered = rosterEntry({ studentId: "20260001", serialNumber: "SN-001" });
            const service = new RentalService(store(), new FakeRoster([rosterEntry(), unregistered]));

            await expect(service.signInWithIc("SN-001")).rejects.toMatchObject({ code: "INVALID_CARD_OR_PIN" });
        });
    });
});
