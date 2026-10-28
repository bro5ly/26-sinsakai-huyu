import type { PrismaClient } from "@/generated/prisma/client.js";
import type { CatalogStore, CategoryRecord, ItemTypeRecord } from "./catalog.types.js";

const itemTypeSelect = {
    id: true,
    title: true,
    imageUrl: true,
    rentalPeriodDays: true,
    description: true,
    author: true,
    publisher: true,
    isbn: true,
    manufacturer: true,
    model: true,
    genre: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
    items: {
        select: { id: true, location: true, status: true, rentals: { where: { returnedAt: null }, select: { id: true } } },
        orderBy: { barcode: "asc" },
    },
} as const;

type ItemTypeRow = {
    id: string;
    title: string;
    imageUrl: string | null;
    rentalPeriodDays: number;
    description: string | null;
    author: string | null;
    publisher: string | null;
    isbn: string | null;
    manufacturer: string | null;
    model: string | null;
    genre: { id: string; name: string; category: { id: string; name: string } };
    items: { id: string; location: string | null; status: ItemTypeRecord["items"][number]["status"]; rentals: { id: string }[] }[];
};

// 画面の形(ItemTypeSummary)に合わせ、カテゴリをジャンルの外に出し、貸し出しは「あるかどうか」だけにする
const toRecord = ({ genre: { category, ...genre }, items, ...type }: ItemTypeRow): ItemTypeRecord => ({
    ...type,
    genre,
    category,
    items: items.map(({ rentals, ...item }) => ({ ...item, hasActiveRental: rentals.length > 0 })),
});

export class CatalogRepository implements CatalogStore {
    constructor(private readonly db: PrismaClient) {}

    async findCategories(): Promise<CategoryRecord[]> {
        return this.db.category.findMany({
            select: { id: true, name: true, genres: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
            orderBy: { name: "asc" },
        });
    }

    async findItemTypes(): Promise<ItemTypeRecord[]> {
        const rows = await this.db.itemType.findMany({ select: itemTypeSelect, orderBy: { title: "asc" } });
        return rows.map(toRecord);
    }

    async findItemType(id: string): Promise<ItemTypeRecord | null> {
        const row = await this.db.itemType.findUnique({ where: { id }, select: itemTypeSelect });
        return row ? toRecord(row) : null;
    }
}
