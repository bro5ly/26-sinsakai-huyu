import type { User } from "@/generated/prisma/client.js"
import {prisma} from "@/lib/prisma.js"

export type UserCreate = Omit<User,
        'id'|
        'slackUserId' | 
        'slackTeamId' | 
        'isActive' | 
        'createdAt' | 
        'updatedAt'
    >

export class UserRepository {
    constructor(private readonly db = prisma){}
    async create(data: UserCreate){
        const {
            name,
            email,
            passwordHash,
            serialNumber,
            userType,
            grade,
            major,
            studentId
        } = data
        return await this.db.user.create({
            data: {
            name,
            email,
            passwordHash,
            serialNumber,
            userType,
            grade,
            major,
            studentId
        } 
        })
    }
    async findByStudentId(studentId: string){
        return await this.db.user.findUnique({
            where: {
                studentId
            },
            select:{
                id: true,
                studentId: true,
                passwordHash: true,
                userType: true,
                email: true
            }
        })
    }

    async findByExternalStudentId(studentId: string){
        return await this.db.externalUser.findUnique({
            where: {studentId},
            select: {
                email: true,
                serialNumber: true,
                userType: true,
                name: true,
                grade: true,
                major: true,
                studentId: true,
            }
        })
    }
}