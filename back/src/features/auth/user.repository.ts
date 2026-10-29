import type { PrismaClient } from "@/generated/prisma/client.js";
import type { LoginAttempt, NewUser, UserRecord, UserStore } from "./auth.types.js";

const userSelect = {
  id: true,
  studentId: true,
  passwordHash: true,
  role: true,
  // 無効な人はログインさせない(R-A14)
  isActive: true,
  // 続けて5回間違えたら15分止める(F1)
  loginFailedAttempts: true,
  loginLockedUntil: true,
} as const;

// このシステムのDBにある利用者だけを読み書きする。名前・メール・カードの番号は名簿の窓口(Roster)から取る
export class UserRepository implements UserStore {
  constructor(private readonly db: PrismaClient) {}

  async createUser(data: NewUser): Promise<UserRecord> {
    return this.db.user.create({ data, select: userSelect });
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { id: userId }, select: userSelect });
  }

  async findUserByStudentId(studentId: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { studentId }, select: userSelect });
  }

  async saveLoginAttempt(data: LoginAttempt): Promise<void> {
    await this.db.user.update({
      where: { id: data.userId },
      data: { loginFailedAttempts: data.failedAttempts, loginLockedUntil: data.lockedUntil },
    });
  }
}
