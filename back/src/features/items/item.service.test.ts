import { describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { ItemService, type ItemStore } from "./item.service.js";

// このシステムのDB側の利用者。名前などは持たない
const user = {
    id: "user-3",
    studentId: "20240003",
    isActive: true,
    canBorrow: true,
    maxItems: 3,
    suspendedUntil: null,
    suspensionReason: null,
    rentals: [],
};

const store = (overrides: Partial<ItemStore> = {}): ItemStore => ({
    findAll: notUsed,
    getMyInfo: async (userId) => (userId === user.id ? user : null),
    ...overrides,
});


describe("getMyInfo(自分の情報)", () => {
    describe("正常系", () => {
        it("M1 登録済みで名簿にいれば、名簿の名前・メール・カードの番号と、貸し出しの決まりを返す", async () => {
            const service = new ItemService(store(), new FakeRoster([rosterEntry()]));

            const result = await service.getMyInfo("user-3");

            expect(result).toMatchObject({
                id: "user-3",
                studentId: "20240003",
                isActive: true,
                name: "鈴木 次郎",
                email: "suzuki@example.com",
                serialNumber: "IC-CARD-003",
                userType: "STUDENT",
                grade: "1年",
                major: "機械工学科",
                rentalSetting: { canBorrow: true, maxItems: 3, suspendedUntil: null, suspensionReason: null },
                rentals: [],
            });
        });

        it("M4 借りている物は、返却期限から決めた状態付きで返す(延滞はOVERDUE。R-30)", async () => {
            const rental = { id: "r1", dueDate: new Date(Date.now() - 86_400_000), returnedAt: null, item: { status: "AVAILABLE" } };
            // テストに要る項目だけを持つ形
            const service = new ItemService(store({ getMyInfo: async () => ({ ...user, rentals: [rental] }) as never }), new FakeRoster([rosterEntry()]));

            const result = await service.getMyInfo("user-3");

            expect(result.rentals.map((r) => [r.id, r.status, r.item.status])).toEqual([["r1", "OVERDUE", "RENTED"]]);
        });
    });

    describe("異常系", () => {
        it("M2 利用者がいなければ、断る(UNAUTHENTICATED)", async () => {
            const service = new ItemService(store(), new FakeRoster([rosterEntry()]));

            await expect(service.getMyInfo("user-x")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });

        it("M3 名簿から消えていれば、断る(UNAUTHENTICATED。Q13)", async () => {
            const service = new ItemService(store(), new FakeRoster([]));

            await expect(service.getMyInfo("user-3")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });
    });
});

describe("findAll(カタログの物品の状態)", () => {
    const item = (id: string, status: string, activeRentals: number) => ({ id, status, rentals: Array.from({ length: activeRentals }, (_, i) => ({ id: `r${i}` })) });

    describe("正常系", () => {
        it("K1 使える物で返却されていない貸し出しがあれば、貸出中(RENTED)にし、貸し出しの中身は返さない(R-31・R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i1", "AVAILABLE", 1)] as never }), new FakeRoster([]));

            const [result] = await service.findAll();

            expect(result).toEqual({ id: "i1", status: "RENTED" });
        });

        it("K2 使える物で貸し出しが無ければ、貸し出し可能(AVAILABLE)(R-31・R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i2", "AVAILABLE", 0)] as never }), new FakeRoster([]));

            expect(await service.findAll()).toEqual([{ id: "i2", status: "AVAILABLE" }]);
        });
    });

    describe("異常系", () => {
        it("K3 修理中なら、貸し出しの記録があっても修理中(MAINTENANCE)(R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i3", "MAINTENANCE", 1)] as never }), new FakeRoster([]));

            expect(await service.findAll()).toEqual([{ id: "i3", status: "MAINTENANCE" }]);
        });
    });
});
