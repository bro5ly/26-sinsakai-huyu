import type { PrismaClient } from "@/generated/prisma/client.js";

export class AuthRepository {
    constructor(private readonly db: PrismaClient){}
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

    // コードが合ったあとに、登録用トークンのハッシュを同じ行に書く。番号そのものは置かない(A8-8)
    async saveRegistrationToken(data: {studentId: string, tokenHash: string, expiresAt: Date}){
        await this.db.verificationCode.update({
            where: {studentId: data.studentId},
            data: {tokenHash: data.tokenHash, tokenExpiresAt: data.expiresAt},
        })
    }

    async findByRegistrationTokenHash(tokenHash: string){
        return this.db.verificationCode.findUnique({
            where: {tokenHash},
            select: {studentId: true, tokenExpiresAt: true},
        })
    }
}
