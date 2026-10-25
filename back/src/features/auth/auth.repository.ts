import type { PrismaClient } from "@/generated/prisma/client.js";

export class AuthRepository {
    constructor(private readonly db: PrismaClient){}
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

    async findRefreshToken(refreshToken: string){
        return this.db.refreshToken.findFirst({
            where: {token: refreshToken}
        })
    }

    // 無いトークン(ログアウト済みなど)でも失敗させない。何度ログアウトしてもよいように
    async deleteRefreshToken(refreshToken: string){
        await this.db.refreshToken.deleteMany({
            where: {token: refreshToken}
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