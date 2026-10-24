import { createPrisma } from "@/lib/prisma.js";
import { MailService } from "@/lib/mail.js";
import { UserRepository } from "@/features/user/UserRepository.js";
import { AuthRepository } from "@/features/auth/auth.repository.js";
import { ItemRepository } from "@/features/items/item.repository.js";
import { RentalRepository } from "@/features/rentals/rental.repository.js";
import { PrismaRoster } from "@/features/roster/prisma-roster.js";
import type { AuthStore, Mailer, UserStore } from "@/features/auth/auth.service.js";
import type { ItemStore } from "@/features/items/item.service.js";
import type { RentalStore } from "@/features/rentals/rental.service.js";
import type { Roster } from "@/features/roster/roster.js";
import type { Config } from "@/config.js";

// appが外の世界(DB・名簿・メール)に触る部品。テストはここに偽物を渡す
export type Deps = {
    users: UserStore;
    auth: AuthStore;
    mailer: Mailer;
    roster: Roster;
    items: ItemStore;
    rentals: RentalStore;
};

// 本物の部品を作るのはここだけ。学校の名簿の実装ができたら、rosterをここで差し替える(2026-10-24 D2)
export const buildDeps = (config: Config): Deps => {
    const prisma = createPrisma(config.databaseUrl);
    return {
    users: new UserRepository(prisma),
    auth: new AuthRepository(prisma),
    mailer: new MailService(config.mail),
    roster: new PrismaRoster(prisma),
    items: new ItemRepository(prisma),
    rentals: new RentalRepository(prisma),
    };
};
