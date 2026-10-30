import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
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

// 行の型は select から作る(手で書くと select を変えたときにずれる。0.9 M4)
type ItemTypeRow = Prisma.ItemTypeGetPayload<{ select: typeof itemTypeSelect }>;

// 画面の形(ItemTypeSummary)に合わせ、カテゴリをジャンルの外に出し、貸し出しは「あるかどうか」だけにする
const toItemTypeRecord = ({ genre: { category, ...genre }, items, ...type }: ItemTypeRow): ItemTypeRecord => ({
  ...type,
  genre,
  category,
  items: items.map(({ rentals, ...item }) => ({ ...item, hasActiveRental: rentals.length > 0 })),
});

// カタログ(種類・カテゴリ・物品の状態)を読むだけ。貸し出せるかは rental.status.ts で組み立てる
export class CatalogRepository implements CatalogStore {
  constructor(private readonly db: PrismaClient) {}

  async findAllCategories(): Promise<CategoryRecord[]> {
    return this.db.category.findMany({
      select: { id: true, name: true, genres: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async findAllItemTypes(): Promise<ItemTypeRecord[]> {
    const rows = await this.db.itemType.findMany({ select: itemTypeSelect, orderBy: { title: "asc" } });
    return rows.map(toItemTypeRecord);
  }

  async findItemTypeById(id: string): Promise<ItemTypeRecord | null> {
    const row = await this.db.itemType.findUnique({ where: { id }, select: itemTypeSelect });
    return row ? toItemTypeRecord(row) : null;
  }
}
