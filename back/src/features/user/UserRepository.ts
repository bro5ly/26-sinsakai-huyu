import {prisma} from "@/lib/prisma.js"

// 名前・メール・カードの番号は名簿(ExternalUser)にだけあるので、いつも一緒に取る
const userWithProfile = {
    id: true,
    studentId: true,
    passwordHash: true,
    role: true,
    externalUser: {
        select: {
            name: true,
            email: true,
            serialNumber: true,
            userType: true,
            grade: true,
            major: true,
        }
    }
} as const

export type UserWithProfile = NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>

export class UserRepository {
    constructor(private readonly db = prisma){}
    async create(data: {studentId: string, passwordHash: string}){
        return await this.db.user.create({
            data,
            select: userWithProfile
        })
    }

    async findById(userId: string){
        return await this.db.user.findUnique({
            where: {
                id: userId
            },
            select: userWithProfile
        })
    }

    async findByStudentId(studentId: string){
        return await this.db.user.findUnique({
            where: {
                studentId
            },
            select: userWithProfile
        })
    }

    async findByExternalStudentId(studentId: string){
        return await this.db.externalUser.findUnique({
            where: {studentId},
            select: {
                email: true,
                studentId: true,
            }
        })
    }
}
