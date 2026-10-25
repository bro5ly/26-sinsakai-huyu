import { describe, expect, it } from "vitest";
import { notUsed } from "@/test/fake-roster.js";
import { ItemService, type ItemStore } from "./item.service.js";

const store = (overrides: Partial<ItemStore> = {}): ItemStore => ({
    findAll: notUsed,
    ...overrides,
});

// 本人の情報(M1〜M4)は features/me/me.service.test.ts(ME1〜ME5・MR1〜MR2)に移した(2026-10-25)
describe("findAll(カタログの物品の状態)", () => {
    const item = (id: string, status: string, activeRentals: number) => ({ id, status, rentals: Array.from({ length: activeRentals }, (_, i) => ({ id: `r${i}` })) });

    describe("正常系", () => {
        it("K1 使える物で返却されていない貸し出しがあれば、貸出中(RENTED)にし、貸し出しの中身は返さない(R-31・R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i1", "AVAILABLE", 1)] as never }));

            const [result] = await service.findAll();

            expect(result).toEqual({ id: "i1", status: "RENTED" });
        });

        it("K2 使える物で貸し出しが無ければ、貸し出し可能(AVAILABLE)(R-31・R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i2", "AVAILABLE", 0)] as never }));

            expect(await service.findAll()).toEqual([{ id: "i2", status: "AVAILABLE" }]);
        });
    });

    describe("異常系", () => {
        it("K3 修理中なら、貸し出しの記録があっても修理中(MAINTENANCE)(R-32)", async () => {
            const service = new ItemService(store({ findAll: async () => [item("i3", "MAINTENANCE", 1)] as never }));

            expect(await service.findAll()).toEqual([{ id: "i3", status: "MAINTENANCE" }]);
        });
    });
});
