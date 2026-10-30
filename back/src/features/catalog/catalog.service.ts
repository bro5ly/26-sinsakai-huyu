import type { Category, ItemTypeDetail, ItemTypeSummary } from "@sinsakai/shared";
import { DomainError } from "@/lib/domain-error.js";
import { itemAvailability } from "@/features/rentals/rental.status.js";
import type { CatalogItemRecord, CatalogStore, ItemTypeRecord } from "./catalog.types.js";

// 廃棄済みはもう戻らないので、全数にも詳細の一覧にも入れない。修理中・紛失は戻ることがあるので入れる(2026-10-28 Ca4)
const inCatalog = (item: CatalogItemRecord) => item.status !== "DISPOSED";
const stateOf = (item: CatalogItemRecord) => itemAvailability(item.status, item.hasActiveRental);

const toSummary = (type: ItemTypeRecord): ItemTypeSummary => {
  const items = type.items.filter(inCatalog);
  return {
    id: type.id,
    title: type.title,
    genre: type.genre,
    category: type.category,
    imageUrl: type.imageUrl,
    rentalPeriodDays: type.rentalPeriodDays,
    availableCount: items.filter((item) => stateOf(item) === "AVAILABLE").length,
    totalCount: items.length,
  };
};

type Parts = { catalog: CatalogStore };

// カタログ(docs/api.md 4.3)。絞り込みは今は画面でする(Ca3)ので、ここは全部を返す
export class CatalogService {
  private readonly catalog: CatalogStore;

  constructor(parts: Parts) {
    this.catalog = parts.catalog;
  }

  async listCategories(): Promise<Category[]> {
    return this.catalog.findAllCategories();
  }

  async listItemTypes(): Promise<ItemTypeSummary[]> {
    return (await this.catalog.findAllItemTypes()).map(toSummary);
  }

  async getItemType(id: string): Promise<ItemTypeDetail> {
    const type = await this.catalog.findItemTypeById(id);
    if (!type) throw new DomainError("NOT_FOUND");
    return {
      ...toSummary(type),
      description: type.description,
      author: type.author,
      publisher: type.publisher,
      isbn: type.isbn,
      manufacturer: type.manufacturer,
      model: type.model,
      items: type.items
        .filter(inCatalog)
        .map((item) => ({ id: item.id, location: item.location, state: stateOf(item) })),
    };
  }
}
