import { describe, expect, it } from "vitest";
import { notUsed } from "@/test/fake-roster.js";
import { CatalogService } from "./catalog.service.js";
import type { CatalogItemRecord, CatalogStore, ItemTypeRecord } from "./catalog.types.js";

const item = (id: string, status: CatalogItemRecord["status"], hasActiveRental = false): CatalogItemRecord => ({
  id,
  location: "A棟-2F-101",
  status,
  hasActiveRental,
});

const macbook = (items: CatalogItemRecord[]): ItemTypeRecord => ({
  id: "type-1",
  title: "MacBook Pro 16インチ",
  genre: { id: "genre-1", name: "ノートパソコン" },
  category: { id: "cat-1", name: "電子機器" },
  imageUrl: "/images/macbook-pro.jpg",
  rentalPeriodDays: 7,
  description: "M3 Pro搭載",
  author: null,
  publisher: null,
  isbn: null,
  manufacturer: "Apple",
  model: "MRW13J/A",
  items,
});

const store = (overrides: Partial<CatalogStore> = {}): CatalogStore => ({
  findAllCategories: notUsed,
  findAllItemTypes: notUsed,
  findItemTypeById: notUsed,
  ...overrides,
});

const catalogService = (catalog: CatalogStore) => new CatalogService({ catalog });

describe("listItemTypes(種類ごとの一覧)", () => {
  describe("正常系", () => {
    it("CT1 種類ごとに、貸し出せる数(使えて貸し出されていない物)と全数を数え、物品1つ1つと説明は返さない(R-31。docs/api.md 5章 ItemTypeSummary)", async () => {
      const items = [item("i1", "AVAILABLE"), item("i2", "AVAILABLE", true), item("i3", "MAINTENANCE")];
      const service = catalogService(store({ findAllItemTypes: async () => [macbook(items)] }));

      const [summary] = await service.listItemTypes();

      expect(summary).toEqual({
        id: "type-1",
        title: "MacBook Pro 16インチ",
        genre: { id: "genre-1", name: "ノートパソコン" },
        category: { id: "cat-1", name: "電子機器" },
        imageUrl: "/images/macbook-pro.jpg",
        rentalPeriodDays: 7,
        availableCount: 1,
        totalCount: 3,
      });
    });
  });

  describe("境界値", () => {
    it("CT2 廃棄済みは全数に入れず、紛失は入れる(紛失は戻ってくることがある。2026-10-28 Ca4)", async () => {
      const items = [item("i1", "AVAILABLE"), item("i2", "LOST"), item("i3", "DISPOSED")];
      const service = catalogService(store({ findAllItemTypes: async () => [macbook(items)] }));

      const [summary] = await service.listItemTypes();

      expect(summary).toMatchObject({ availableCount: 1, totalCount: 2 });
    });

    it("CT3 物品が1つも無い種類も、0件として返す(貸し出せる数0・全数0)", async () => {
      const service = catalogService(store({ findAllItemTypes: async () => [macbook([])] }));

      const [summary] = await service.listItemTypes();

      expect(summary).toMatchObject({ availableCount: 0, totalCount: 0 });
    });
  });
});

describe("getItemType(種類の詳細)", () => {
  describe("正常系", () => {
    it("CT4 説明と、物品1つ1つの状態(貸出中はRENTED、修理中は貸し出しがあっても修理中)を返す(R-32)", async () => {
      const items = [item("i1", "AVAILABLE"), item("i2", "AVAILABLE", true), item("i3", "MAINTENANCE", true)];
      const service = catalogService(
        store({ findItemTypeById: async (id) => (id === "type-1" ? macbook(items) : null) }),
      );

      const detail = await service.getItemType("type-1");

      expect(detail).toMatchObject({
        id: "type-1",
        description: "M3 Pro搭載",
        manufacturer: "Apple",
        availableCount: 1,
        totalCount: 3,
      });
      expect(detail.items).toEqual([
        { id: "i1", location: "A棟-2F-101", state: "AVAILABLE" },
        { id: "i2", location: "A棟-2F-101", state: "RENTED" },
        { id: "i3", location: "A棟-2F-101", state: "MAINTENANCE" },
      ]);
    });
  });

  describe("異常系", () => {
    it("CT5 無い種類のIDなら、断る(NOT_FOUND)", async () => {
      const service = catalogService(store({ findItemTypeById: async () => null }));

      await expect(service.getItemType("type-x")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("境界値", () => {
    it("CT6 廃棄済みの物品は、詳細の一覧にも入れない(Ca4)", async () => {
      const service = catalogService(
        store({ findItemTypeById: async () => macbook([item("i1", "AVAILABLE"), item("i2", "DISPOSED")]) }),
      );

      const detail = await service.getItemType("type-1");

      expect(detail.items.map((i) => i.id)).toEqual(["i1"]);
    });
  });
});

describe("listCategories(カテゴリとジャンル)", () => {
  describe("正常系", () => {
    it("CT7 カテゴリを、その中のジャンル付きで返す(絞り込みの選択肢)", async () => {
      const categories = [{ id: "cat-1", name: "電子機器", genres: [{ id: "genre-1", name: "ノートパソコン" }] }];
      const service = catalogService(store({ findAllCategories: async () => categories }));

      expect(await service.listCategories()).toEqual(categories);
    });
  });
});
