import type { ItemRepository } from "./item.repository.js";
import { AppError } from "@/lib/error.js";

export class ItemService {
    constructor(private itemRepository: ItemRepository) { }

    async findAll() {
        const items = await this.itemRepository.findAll();
        return items;
    }

    async getMyInfo(userId: string) {
        const user = await this.itemRepository.getMyInfo(userId);

        if (!user) {
            throw new AppError('ユーザーが見つかりません', 404, 'USER_NOT_FOUND');
        }

        return user;
    }
}