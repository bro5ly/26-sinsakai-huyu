import type { PrismaClient } from "@/generated/prisma/client.js";
import type { CardHolderRecord, CardHolderStore, PinAttempt } from "./tablet-session.types.js";

const cardHolderSelect = {
  id: true,
  role: true,
  isActive: true,
  pinHash: true,
  pinFailedAttempts: true,
  pinLockedAt: true,
} as const;

// カードを持つ人のPINの状態を読み書きするだけ。通してよいかの判断は tablet-session.check.ts
export class CardHolderRepository implements CardHolderStore {
  constructor(private readonly db: PrismaClient) {}

  async findCardHolderByStudentId(studentId: string): Promise<CardHolderRecord | null> {
    return this.db.user.findUnique({ where: { studentId }, select: cardHolderSelect });
  }

  async savePinAttempt(data: PinAttempt): Promise<void> {
    await this.db.user.update({
      where: { id: data.userId },
      data: { pinFailedAttempts: data.failedAttempts, pinLockedAt: data.lockedAt },
    });
  }
}
