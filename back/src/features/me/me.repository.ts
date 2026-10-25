import type { PrismaClient } from "@/generated/prisma/client.js";
import type { ActiveRentalRecord, MeStore, MeUserRecord } from "./me.types.js";

// 本人の情報のうち、このシステムのDBにある分だけを読む。名前・メールなどは名簿の窓口(Roster)から取る
export class MeRepository implements MeStore {
    constructor(private readonly db: PrismaClient) {}

    async findUser(userId: string): Promise<MeUserRecord | null> {
        return this.db.user.findUnique({
            where: { id: userId },
            select: { id: true, studentId: true, role: true, canBorrow: true, maxItems: true, suspendedUntil: true },
        });
    }

    async findActiveRentals(userId: string): Promise<ActiveRentalRecord[]> {
        const rows = await this.db.rental.findMany({
            where: { userId, returnedAt: null },
            orderBy: { rentedAt: "desc" },
            select: {
                id: true,
                rentedAt: true,
                dueDate: true,
                returnedAt: true,
                item: {
                    select: {
                        id: true,
                        barcode: true,
                        itemType: { select: { id: true, title: true, genre: { select: { id: true, name: true } } } },
                    },
                },
            },
        });
        // 画面の形(Rental)に合わせ、種類を物品の外に出す
        return rows.map(({ item: { itemType, ...item }, ...rental }) => ({ ...rental, item, itemType }));
    }
}
