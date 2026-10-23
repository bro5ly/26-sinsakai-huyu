import {prisma} from "@/lib/prisma.js"

// このシステムのDBにある利用者だけを読む。名前・メール・カードの番号は名簿の窓口(Roster)から取る
const userSelect = {
    id: true,
    studentId: true,
    passwordHash: true,
    role: true,
} as const

export class UserRepository {
    constructor(private readonly db = prisma){}
    async create(data: {studentId: string, passwordHash: string}){
        return await this.db.user.create({
            data,
            select: userSelect
        })
    }

    async findById(userId: string){
        return await this.db.user.findUnique({
            where: {
                id: userId
            },
            select: userSelect
        })
    }

    async findByStudentId(studentId: string){
        return await this.db.user.findUnique({
            where: {
                studentId
            },
            select: userSelect
        })
    }
}
