import type { PrismaClient } from "@/generated/prisma/client.js";
import type { SessionRecord, SessionStore } from "./auth.types.js";

// セッションの行を読み書きするだけ。通してよいかの判断は session.check.ts
export class SessionRepository implements SessionStore {
  constructor(private readonly db: PrismaClient) {}

  async create(data: {
    tokenHash: string;
    userId: string;
    kind: SessionRecord["kind"];
    expiresAt: Date;
    deviceId?: string;
  }): Promise<void> {
    await this.db.session.create({ data });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.db.session.findUnique({
      where: { tokenHash },
      select: {
        kind: true,
        expiresAt: true,
        createdAt: true,
        deviceId: true,
        lastUsedAt: true,
        user: { select: { id: true, role: true, isActive: true } },
      },
    });
  }

  async touch(tokenHash: string, now: Date): Promise<void> {
    await this.db.session.update({ where: { tokenHash }, data: { lastUsedAt: now } });
  }

  // 無い番号(ログアウト済みなど)でも失敗させない。何度ログアウトしてもよいように
  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }
}
