import type { ItemRepository } from "./item.repository.js";
import { itemAvailability } from "../rentals/rental.status.js";

export type ItemStore = Pick<ItemRepository, "findAll">

export class ItemService {
    constructor(private itemRepository: ItemStore) { }

    async findAll() {
        const items = await this.itemRepository.findAll();
        return items.map(({ rentals, ...item }) => ({
            ...item,
            status: itemAvailability(item.status, rentals.length > 0)
        }));
    }
}
