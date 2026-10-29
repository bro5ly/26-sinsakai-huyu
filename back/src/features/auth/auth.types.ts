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
    // 続けて間違えた回数と、いつまで止めるか(F1)
    loginFailedAttempts: number;
    loginLockedUntil: Date | null;
}

// 登録の認証コード。コードが合ったら、同じ行に登録用トークンのハッシュを書く(A8-8)
export interface CodeRecord {
    studentId: string;
    // コードそのものは持たず、ハッシュだけ(docs/auth.md 4.6)
    codeHash: string;
    expiresAt: Date;
    tokenHash: string | null;
    // このコードで間違えた回数(R-8)
    attempts: number;
}

export interface RegistrationTokenRecord {
    studentId: string;
    tokenExpiresAt: Date | null;
}

// 通してよいかの判断(session.check.ts・tablet-session.check.ts)に要る分だけ
export interface SessionRecord {
    kind: "WEB" | "TABLET";
    expiresAt: Date;
    createdAt: Date;
    // タブレットのセッションだけ: 作った端末と、最後に使った日時(R-A8・R-A9)。Webでは null
    deviceId: string | null;
    lastUsedAt: Date | null;
    user: { id: string; role: "MEMBER" | "ADMIN"; isActive: boolean };
}

export interface UserStore {
    create(data: { studentId: string; passwordHash: string }): Promise<UserRecord>;
    findById(userId: string): Promise<UserRecord | null>;
    findByStudentId(studentId: string): Promise<UserRecord | null>;
    saveLoginAttempt(data: { userId: string; failedAttempts: number; lockedUntil: Date | null }): Promise<void>;
}

export interface CodeStore {
    // 申請し直したら、前のコード・間違えた回数・登録用トークンを消して置き換える(R-5)
    saveTmpCode(data: { studentId: string; codeHash: string; expiresAt: Date }): Promise<void>;
    saveCodeAttempts(data: { studentId: string; attempts: number }): Promise<void>;
    checkTmpCode(studentId: string): Promise<CodeRecord | null>;
    deleteTmpCode(studentId: string): Promise<void>;
    saveRegistrationToken(data: { studentId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
    findByRegistrationTokenHash(tokenHash: string): Promise<RegistrationTokenRecord | null>;
}

export interface SessionStore {
    create(data: { tokenHash: string; userId: string; kind: SessionRecord["kind"]; expiresAt: Date; deviceId?: string }): Promise<void>;
    findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
    // タブレットのセッションを使うたびに、最後に使った日時を書き換える(無操作30秒を数えるため)
    touch(tokenHash: string, now: Date): Promise<void>;
    // 無い番号(ログアウト済みなど)でも失敗させない。何度ログアウトしてもよいように
    deleteByTokenHash(tokenHash: string): Promise<void>;
}

// パスワードのハッシュ(本物は lib/password.ts のbcrypt)
export interface PasswordHasher {
    hash(plain: string): Promise<string>;
    matches(plain: string, hash: string): Promise<boolean>;
}

// 推測できない値を作る(本物は lib/session-token.ts)。テストでは決まった値を返せる
export interface SecretSource {
    newCode(): string;
    newToken(): string;
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
