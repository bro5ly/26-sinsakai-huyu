import { ApiService } from "./api.service";
import { ItemsResponse, ItemDetailResponse } from "@/types";

class ItemService extends ApiService {
  async getAllItems(): Promise<ItemsResponse> {
    return this.get<ItemsResponse>("/api/items");
  }

  async getItemsByTitle(title: string): Promise<ItemDetailResponse> {
    return this.get<ItemDetailResponse>(
      `/api/items/${encodeURIComponent(title)}`
    );
  }
}

export const itemService = new ItemService();
