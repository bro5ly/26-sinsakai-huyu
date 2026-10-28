import type { Categories, ItemTypeDetail, ItemTypes } from "@sinsakai/shared";
import { ApiService } from "./api.service";

// カタログ(docs/api.md 4.3・shared/src/catalog.ts)。ログイン必須なので、どれもWebのセッション(Cookie)が要る
class CatalogService extends ApiService {
  async getCategories(): Promise<Categories> {
    return this.get<Categories>("/api/categories");
  }

  async getItemTypes(): Promise<ItemTypes> {
    return this.get<ItemTypes>("/api/item-types");
  }

  async getItemType(id: string): Promise<ItemTypeDetail> {
    return this.get<ItemTypeDetail>(`/api/item-types/${encodeURIComponent(id)}`);
  }
}

export const catalogService = new CatalogService();
