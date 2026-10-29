import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client.js";

// 接続先は外から受け取る。作るのは deps.ts の buildDeps() と prisma/seed.ts だけ
export const createPrisma = (databaseUrl: string) =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
