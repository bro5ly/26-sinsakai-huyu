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

    it("M2 利用者がいなければ、断る(404 USER_NOT_FOUND)", async () => {
        const service = new ItemService(store(), new FakeRoster([rosterEntry()]));

        await expect(service.getMyInfo("user-x")).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
    });

    it("M3 名簿から消えていれば、断る(404 USER_NOT_FOUND。Q13)", async () => {
        const service = new ItemService(store(), new FakeRoster([]));

        await expect(service.getMyInfo("user-3")).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
    });
});
