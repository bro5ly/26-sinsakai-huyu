import type { ItemRepository } from "./item.repository.js";

export class ItemService {
    constructor(private itemRepository: ItemRepository) { }

    async findAll() {
        return this.itemRepository.findAll();
    }
}