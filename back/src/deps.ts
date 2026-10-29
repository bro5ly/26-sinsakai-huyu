import { createPrisma } from "@/lib/prisma.js";
import { MailService } from "@/lib/mail.js";
import { UserRepository } from "@/features/user/UserRepository.js";
import { AuthRepository } from "@/features/auth/auth.repository.js";
import { SessionRepository } from "@/features/auth/session.repository.js";
import { CatalogRepository } from "@/features/catalog/catalog.repository.js";
import { RentalRepository } from "@/features/rentals/rental.repository.js";
import { PrismaRoster } from "@/features/roster/prisma-roster.js";
import { MeRepository } from "@/features/me/me.repository.js";
import type { CodeStore, Mailer, SessionStore, UserStore } from "@/features/auth/auth.types.js";
import type { CatalogStore } from "@/features/catalog/catalog.types.js";
import type { RentalStore } from "@/features/rentals/rental.service.js";
import type { Roster } from "@/features/roster/roster.js";
import type { MeStore } from "@/features/me/me.types.js";
import type { Config } from "@/config.js";

// appが外の世界(DB・名簿・メール)に触る部品。テストはここに偽物を渡す
export type Deps = {
    users: UserStore;
    auth: CodeStore;
    sessions: SessionStore;
    mailer: Mailer;
    roster: Roster;
    catalog: CatalogStore;
    me: MeStore;
    rentals: RentalStore;
};

// 本物の部品を作るのはここだけ。学校の名簿の実装ができたら、rosterをここで差し替える(2026-10-24 D2)
export const buildDeps = (config: Config): Deps => {
    const prisma = createPrisma(config.databaseUrl);
    return {
    users: new UserRepository(prisma),
    auth: new AuthRepository(prisma),
    sessions: new SessionRepository(prisma),
    mailer: new MailService(config.mail),
    roster: new PrismaRoster(prisma),
    catalog: new CatalogRepository(prisma),
    me: new MeRepository(prisma),
    rentals: new RentalRepository(prisma),
    };
};
