import type { PrismaClient } from "@/generated/prisma/client.js";
import type { CodeRecord, CodeStore, RegistrationTokenRecord } from "./auth.types.js";

// 登録の認証コードと登録用トークン(どちらも verification_codes の行)を読み書きするだけ
export class AuthRepository implements CodeStore {
    constructor(private readonly db: PrismaClient){}

    async saveTmpCode(data: {studentId: string, code: string, expiresAt: Date}): Promise<void> {
        await this.db.verificationCode.create({
            data: {
                studentId: data.studentId,
                code: data.code,
                expiresAt: data.expiresAt
            }
        })
    }

    async checkTmpCode(studentId: string): Promise<CodeRecord | null> {
        return this.db.verificationCode.findUnique({
            where: {studentId},
            select: {studentId: true, code: true, expiresAt: true, tokenHash: true},
        })
    }

    async deleteTmpCode(studentId: string): Promise<void> {
        await this.db.verificationCode.delete({
            where: {studentId}
        })
    }

    // コードが合ったあとに、登録用トークンのハッシュを同じ行に書く。番号そのものは置かない(A8-8)
    async saveRegistrationToken(data: {studentId: string, tokenHash: string, expiresAt: Date}): Promise<void> {
        await this.db.verificationCode.update({
            where: {studentId: data.studentId},
            data: {tokenHash: data.tokenHash, tokenExpiresAt: data.expiresAt},
        })
    }

    async findByRegistrationTokenHash(tokenHash: string): Promise<RegistrationTokenRecord | null> {
        return this.db.verificationCode.findUnique({
            where: {tokenHash},
            select: {studentId: true, tokenExpiresAt: true},
        })
    }
}
