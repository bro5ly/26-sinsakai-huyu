// features/auth/auth.types.ts
// 認証の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3、0.8 R8)
import type { SessionUser } from "@sinsakai/shared";

// このシステムのDBにある利用者。名前・メールなどは名簿(Roster)から取る
export interface UserRecord {
    id: string;
    studentId: string;
    passwordHash: string;
    role: "MEMBER" | "ADMIN";
    isActive: boolean;
}

// 登録の認証コード。コードが合ったら、同じ行に登録用トークンのハッシュを書く(A8-8)
export interface CodeRecord {
    studentId: string;
    code: string;
    expiresAt: Date;
    tokenHash: string | null;
}

export interface RegistrationTokenRecord {
    studentId: string;
    tokenExpiresAt: Date | null;
}

// 通してよいかの判断(session.check.ts)に要る分だけ
export interface SessionRecord {
    kind: "WEB" | "TABLET";
    expiresAt: Date;
    user: { id: string; role: "MEMBER" | "ADMIN"; isActive: boolean };
}

export interface UserStore {
    create(data: { studentId: string; passwordHash: string }): Promise<UserRecord>;
    findById(userId: string): Promise<UserRecord | null>;
    findByStudentId(studentId: string): Promise<UserRecord | null>;
}

export interface CodeStore {
    saveTmpCode(data: { studentId: string; code: string; expiresAt: Date }): Promise<void>;
    checkTmpCode(studentId: string): Promise<CodeRecord | null>;
    deleteTmpCode(studentId: string): Promise<void>;
    saveRegistrationToken(data: { studentId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
    findByRegistrationTokenHash(tokenHash: string): Promise<RegistrationTokenRecord | null>;
}

export interface SessionStore {
    create(data: { tokenHash: string; userId: string; kind: SessionRecord["kind"]; expiresAt: Date }): Promise<void>;
    findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
    // 無い番号(ログアウト済みなど)でも失敗させない。何度ログアウトしてもよいように
    deleteByTokenHash(tokenHash: string): Promise<void>;
}

export interface Mailer {
    sendCode(email: string, code: string): Promise<void>;
}

export interface AuthResult {
    sessionToken: string; // Cookie用。応答の本文には入れない
    user: SessionUser;
}

export interface VerifyCodeResult {
    token: string;
    expiresAt: Date;
}
