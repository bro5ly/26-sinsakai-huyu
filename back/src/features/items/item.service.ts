import type { ItemRepository } from "./item.repository.js";
import { AppError } from "@/lib/error.js";
import { itemAvailability, rentalStatus } from "../rentals/rental.status.js";

export class ItemService {
    constructor(private itemRepository: ItemRepository) { }

    async findAll() {
        const items = await this.itemRepository.findAll();
        return items.map(({ rentals, ...item }) => ({
            ...item,
            status: itemAvailability(item.status, rentals.length > 0)
        }));
    }

    // 画面が使っている形(名簿の項目が利用者の直下、rentalSetting、状態付きの貸し出し)に組み立てる
    async getMyInfo(userId: string) {
        const user = await this.itemRepository.getMyInfo(userId);

        if (!user) {
            throw new AppError('ユーザーが見つかりません', 404, 'USER_NOT_FOUND');
        }

        const { externalUser, rentals, canBorrow, maxItems, suspendedUntil, suspensionReason, ...rest } = user;
        const now = new Date();
        return {
            ...rest,
            ...externalUser,
            rentalSetting: { canBorrow, maxItems, suspendedUntil, suspensionReason },
            rentals: rentals.map((rental) => ({
                ...rental,
                status: rentalStatus(rental, now),
                item: { ...rental.item, status: itemAvailability(rental.item.status, true) }
            }))
        };
    }
}
