// features/catalog/catalog.types.ts
// カタログの中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T2・T3)

// 物そのものの状態(DBの値)。「貸出中」はDBに無く、返却されていない貸し出しがあるかから決める
export type ItemStatusRecord = "AVAILABLE" | "MAINTENANCE" | "LOST" | "DISPOSED";

export interface CatalogItemRecord {
  id: string;
  location: string | null;
  status: ItemStatusRecord;
  hasActiveRental: boolean;
}

export interface ItemTypeRecord {
  id: string;
  title: string;
  genre: { id: string; name: string };
  category: { id: string; name: string };
  imageUrl: string | null;
  rentalPeriodDays: number;
  description: string | null;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  manufacturer: string | null;
  model: string | null;
  items: CatalogItemRecord[];
}

export interface CategoryRecord {
  id: string;
  name: string;
  genres: { id: string; name: string }[];
}

export interface CatalogStore {
  findAllCategories(): Promise<CategoryRecord[]>;
  findAllItemTypes(): Promise<ItemTypeRecord[]>;
  findItemTypeById(id: string): Promise<ItemTypeRecord | null>;
}
