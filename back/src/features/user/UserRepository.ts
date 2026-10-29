import type { PrismaClient } from "@/generated/prisma/client.js";
import type { UserRecord, UserStore } from "@/features/auth/auth.types.js";

// このシステムのDBにある利用者だけを読む。名前・メール・カードの番号は名簿の窓口(Roster)から取る
const userSelect = {
    id: true,
    studentId: true,
    passwordHash: true,
    role: true,
    // 無効な人はログインさせない(R-A14)
    isActive: true,
} as const

export class UserRepository implements UserStore {
    constructor(private readonly db: PrismaClient){}
    async create(data: {studentId: string, passwordHash: string}): Promise<UserRecord> {
        return await this.db.user.create({
            data,
            select: userSelect
        })
    }

    async findById(userId: string): Promise<UserRecord | null> {
        return await this.db.user.findUnique({
            where: {
                id: userId
            },
            select: userSelect
        })
    }

    async findByStudentId(studentId: string): Promise<UserRecord | null> {
        return await this.db.user.findUnique({
            where: {
                studentId
            },
            select: userSelect
        })
    }
}
