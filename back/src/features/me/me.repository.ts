import type { PrismaClient } from "@/generated/prisma/client.js";
import type { ActiveRentalRecord, MeStore, MeUserRecord } from "./me.types.js";

// 本人の情報のうち、このシステムのDBにある分だけを読む。名前・メールなどは名簿の窓口(Roster)から取る
export class MeRepository implements MeStore {
    constructor(private readonly db: PrismaClient) {}

    async findUser(userId: string): Promise<MeUserRecord | null> {
        const row = await this.db.user.findUnique({
            where: { id: userId },
            select: { id: true, studentId: true, role: true, canBorrow: true, maxItems: true, suspendedUntil: true, pinHash: true, pinLockedAt: true },
        });
        if (!row) return null;
        // PINのハッシュとロックの日時は、このrepositoryの外に出さない(P3)
        const { pinHash, pinLockedAt, ...user } = row;
        return { ...user, pin: { registered: pinHash !== null, locked: pinLockedAt !== null } };
    }

    async findPasswordHash(userId: string): Promise<string | null> {
        const row = await this.db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
        return row?.passwordHash ?? null;
    }

    // 登録し直したら、失敗の回数を0に戻し、ロックを解く(R-A7)
    async savePin(data: { userId: string; pinHash: string }): Promise<void> {
        await this.db.user.update({
            where: { id: data.userId },
            data: { pinHash: data.pinHash, pinFailedAttempts: 0, pinLockedAt: null },
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
                        itemType: { select: { id: true, title: true, genre: { select: { id: true, name: true } } } },
                    },
                },
            },
        });
        // 画面の形(Rental)に合わせ、種類を物品の外に出す
        return rows.map(({ item: { itemType, ...item }, ...rental }) => ({ ...rental, item, itemType }));
    }
}
