import type { ItemRepository } from "./item.repository.js";
import type { Roster } from "../roster/roster.js";
import { DomainError } from "@/lib/domain-error.js";
import { itemAvailability, rentalStatus } from "../rentals/rental.status.js";

export type ItemStore = Pick<ItemRepository, "findAll" | "getMyInfo">

export class ItemService {
    constructor(private itemRepository: ItemStore, private roster: Roster) { }

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
            throw new DomainError('UNAUTHENTICATED');
        }
        // 名簿から消えた人(卒業など)は、登録が残っていても通さない(docs/spec.md Q13)
        const entry = await this.roster.findByStudentId(user.studentId);
        if (!entry) {
            throw new DomainError('UNAUTHENTICATED');
        }

        const { rentals, canBorrow, maxItems, suspendedUntil, suspensionReason, ...rest } = user;
        const now = new Date();
        return {
            ...rest,
            ...entry,
            rentalSetting: { canBorrow, maxItems, suspendedUntil, suspensionReason },
            rentals: rentals.map((rental) => ({
                ...rental,
                status: rentalStatus(rental, now),
                item: { ...rental.item, status: itemAvailability(rental.item.status, true) }
            }))
        };
    }
}
