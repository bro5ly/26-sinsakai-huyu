import type { PrismaClient } from "@/generated/prisma/client.js";
import type { CardHolderRecord, CardHolderStore } from "./tablet-session.types.js";

// カードを持つ人のPINの状態を読み書きするだけ。通してよいかの判断は tablet-session.check.ts
export class CardHolderRepository implements CardHolderStore {
    constructor(private readonly db: PrismaClient) {}

    async findByStudentId(studentId: string): Promise<CardHolderRecord | null> {
        return this.db.user.findUnique({
            where: { studentId },
            select: { id: true, role: true, isActive: true, pinHash: true, pinFailedAttempts: true, pinLockedAt: true },
        });
    }

    async savePinAttempt(data: { userId: string; failedAttempts: number; lockedAt: Date | null }): Promise<void> {
        await this.db.user.update({ where: { id: data.userId }, data: { pinFailedAttempts: data.failedAttempts, pinLockedAt: data.lockedAt } });
    }
}
