import {prisma} from "@/lib/prisma.js"

export class AuthRepository {
    constructor(private readonly db = prisma){}
    async saveRefreshToken(data: {userId: string, refreshToken: string, expiredAt: Date}){
        return this.db.refreshToken.upsert({
            where: {
                userId: data.userId
            },
            update: {
                token: data.refreshToken,
                expiresAt: data.expiredAt
            },
            create: {
                userId: data.userId,
                token: data.refreshToken,
                expiresAt: data.expiredAt
            }
        })
    }
    

    async saveTmpCode(data: {verificationCode: string, studentId: string,expiredAt: Date}){
        return this.db.verificationCode.create({
            data:{
                studentId: data.studentId,
                code: data.verificationCode,
                expiresAt: data.expiredAt
            }
        })
    }

    async checkTmpCode(studentId:string){
        return this.db.verificationCode.findUnique({
            where: {studentId},
        })
    }

    async deleteTmpCode(studentId: string){
        return this.db.verificationCode.delete({
            where:{
                studentId
            }
        })
    }
}