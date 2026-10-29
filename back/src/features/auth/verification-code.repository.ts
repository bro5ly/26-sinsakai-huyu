import type { PrismaClient } from "@/generated/prisma/client.js";
import type {
  NewRegistrationToken,
  NewVerificationCode,
  RegistrationTokenRecord,
  VerificationCodeAttempts,
  VerificationCodeRecord,
  VerificationCodeStore,
} from "./auth.types.js";

// 登録の認証コードと登録用トークン(どちらも verification_codes の行)を読み書きするだけ
export class VerificationCodeRepository implements VerificationCodeStore {
  constructor(private readonly db: PrismaClient) {}

  // 申請し直したら同じ行を置き換える(前のコードは通らなくなる。R-5)。createだと2回目が主キーでぶつかっていた(ずれ1)
  async saveCode(data: NewVerificationCode): Promise<void> {
    const fresh = {
      codeHash: data.codeHash,
      expiresAt: data.expiresAt,
      attempts: 0,
      tokenHash: null,
      tokenExpiresAt: null,
    };
    await this.db.verificationCode.upsert({
      where: { studentId: data.studentId },
      create: { studentId: data.studentId, ...fresh },
      update: fresh,
    });
  }

  async saveCodeAttempts(data: VerificationCodeAttempts): Promise<void> {
    await this.db.verificationCode.update({ where: { studentId: data.studentId }, data: { attempts: data.attempts } });
  }

  async findCodeByStudentId(studentId: string): Promise<VerificationCodeRecord | null> {
    return this.db.verificationCode.findUnique({
      where: { studentId },
      select: { studentId: true, codeHash: true, expiresAt: true, tokenHash: true, attempts: true },
    });
  }

  async deleteCodeByStudentId(studentId: string): Promise<void> {
    await this.db.verificationCode.deleteMany({ where: { studentId } });
  }

  // コードが合ったあとに、登録用トークンのハッシュを同じ行に書く。番号そのものは置かない(A8-8)
  async saveRegistrationToken(data: NewRegistrationToken): Promise<void> {
    await this.db.verificationCode.update({
      where: { studentId: data.studentId },
      data: { tokenHash: data.tokenHash, tokenExpiresAt: data.expiresAt },
    });
  }

  async findRegistrationTokenByHash(tokenHash: string): Promise<RegistrationTokenRecord | null> {
    return this.db.verificationCode.findUnique({
      where: { tokenHash },
      select: { studentId: true, tokenExpiresAt: true },
    });
  }
}
