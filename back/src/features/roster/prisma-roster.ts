import { prisma } from "@/lib/prisma.js";
import type { Roster, RosterEntry } from "./roster.js";

const entrySelect = {
    studentId: true,
    name: true,
    email: true,
    serialNumber: true,
    userType: true,
    grade: true,
    major: true,
} as const;

// 仮の名簿(external_user表)を読む実装。学校のDB・APIの実装ができたら、route での組み立てを差し替える
export class PrismaRoster implements Roster {
    constructor(private readonly db = prisma) {}

    async findByStudentId(studentId: string): Promise<RosterEntry | null> {
        return await this.db.externalUser.findUnique({ where: { studentId }, select: entrySelect });
    }

    async findBySerialNumber(serialNumber: string): Promise<RosterEntry | null> {
        return await this.db.externalUser.findUnique({ where: { serialNumber }, select: entrySelect });
    }

    async findManyByStudentIds(studentIds: string[]): Promise<RosterEntry[]> {
        return await this.db.externalUser.findMany({ where: { studentId: { in: studentIds } }, select: entrySelect });
    }
}
