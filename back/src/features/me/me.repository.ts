import type { PrismaClient } from "@/generated/prisma/client.js";
import { rentalSelect, toRentalRecord } from "@/features/rentals/rental.select.js";
import type { RentalRecord } from "@/features/rentals/rental.types.js";
import type { MeStore, MeUserRecord, NewPin } from "./me.types.js";

const meUserSelect = {
  id: true,
  studentId: true,
  role: true,
  canBorrow: true,
  maxItems: true,
  suspendedUntil: true,
  pinHash: true,
  pinLockedAt: true,
} as const;

// 本人の情報のうち、このシステムのDBにある分だけを読む。名前・メールなどは名簿の窓口(Roster)から取る
export class MeRepository implements MeStore {
  constructor(private readonly db: PrismaClient) {}

  async findUserById(userId: string): Promise<MeUserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: meUserSelect });
    if (!row) return null;
    // PINのハッシュとロックの日時は、このrepositoryの外に出さない(P3)
    const { pinHash, pinLockedAt, ...user } = row;
    return { ...user, pin: { registered: pinHash !== null, locked: pinLockedAt !== null } };
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    return row?.passwordHash ?? null;
  }

  // 登録し直したら、失敗の回数を0に戻し、ロックを解く(R-A7)
  async savePin(data: NewPin): Promise<void> {
    await this.db.user.update({
      where: { id: data.userId },
      data: { pinHash: data.pinHash, pinFailedAttempts: 0, pinLockedAt: null },
    });
  }

  async findActiveRentalsByUserId(userId: string): Promise<RentalRecord[]> {
    const rows = await this.db.rental.findMany({
      where: { userId, returnedAt: null },
      orderBy: { rentedAt: "desc" },
      select: rentalSelect,
    });
    return rows.map(toRentalRecord);
  }
}
