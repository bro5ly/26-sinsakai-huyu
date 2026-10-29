import type { PrismaClient } from "@/generated/prisma/client.js";
import type { NewSession, SessionRecord, SessionStore } from "./auth.types.js";

const sessionSelect = {
  kind: true,
  expiresAt: true,
  createdAt: true,
  deviceId: true,
  lastUsedAt: true,
  user: { select: { id: true, role: true, isActive: true } },
} as const;

// セッションの行を読み書きするだけ。通してよいかの判断は session.check.ts
export class SessionRepository implements SessionStore {
  constructor(private readonly db: PrismaClient) {}

  async createSession(data: NewSession): Promise<void> {
    await this.db.session.create({ data });
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.db.session.findUnique({ where: { tokenHash }, select: sessionSelect });
  }

  async saveSessionLastUsedAt(tokenHash: string, now: Date): Promise<void> {
    await this.db.session.update({ where: { tokenHash }, data: { lastUsedAt: now } });
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }
}
