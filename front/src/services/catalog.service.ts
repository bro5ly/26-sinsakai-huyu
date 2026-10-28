import type { Categories, ItemTypeDetail, ItemTypes } from "@sinsakai/shared";
import { ApiService } from "./api.service";

// カタログ(docs/api.md 4.3・shared/src/catalog.ts)。ログイン必須なので、どれもアクセストークンが要る
class CatalogService extends ApiService {
  async getCategories(accessToken: string): Promise<Categories> {
    return this.get<Categories>("/api/categories", accessToken);
  }

  async getItemTypes(accessToken: string): Promise<ItemTypes> {
    return this.get<ItemTypes>("/api/item-types", accessToken);
  }

  async getItemType(id: string, accessToken: string): Promise<ItemTypeDetail> {
    return this.get<ItemTypeDetail>(`/api/item-types/${encodeURIComponent(id)}`, accessToken);
  }
}

export const catalogService = new CatalogService();
