// 認証の機能の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3、0.9)
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
export interface VerificationCodeRecord {
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

// repositoryに渡す入力。インターフェースとrepositoryの両方がこの名前を使う(0.9 M3)
export interface NewUser {
  studentId: string;
  passwordHash: string;
}

export interface LoginAttempt {
  userId: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface NewVerificationCode {
  studentId: string;
  codeHash: string;
  expiresAt: Date;
}

export interface VerificationCodeAttempts {
  studentId: string;
  attempts: number;
}

export interface NewRegistrationToken {
  studentId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface NewSession {
  tokenHash: string;
  userId: string;
  kind: SessionRecord["kind"];
  expiresAt: Date;
  // タブレットのセッションだけ: 作った端末(R-A8)
  deviceId?: string;
}

export interface UserStore {
  createUser(data: NewUser): Promise<UserRecord>;
  findUserById(userId: string): Promise<UserRecord | null>;
  findUserByStudentId(studentId: string): Promise<UserRecord | null>;
  saveLoginAttempt(data: LoginAttempt): Promise<void>;
}

export interface VerificationCodeStore {
  // 申請し直したら、前のコード・間違えた回数・登録用トークンを消して置き換える(R-5)
  saveCode(data: NewVerificationCode): Promise<void>;
  saveCodeAttempts(data: VerificationCodeAttempts): Promise<void>;
  findCodeByStudentId(studentId: string): Promise<VerificationCodeRecord | null>;
  // 無い行でも失敗させない(同時に2回間違えて、2つとも消しに来ることがあるため)
  deleteCodeByStudentId(studentId: string): Promise<void>;
  saveRegistrationToken(data: NewRegistrationToken): Promise<void>;
  findRegistrationTokenByHash(tokenHash: string): Promise<RegistrationTokenRecord | null>;
}

export interface SessionStore {
  createSession(data: NewSession): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  // タブレットのセッションを使うたびに、最後に使った日時を書き換える(無操作30秒を数えるため)
  saveSessionLastUsedAt(tokenHash: string, now: Date): Promise<void>;
  // 無い番号(ログアウト済みなど)でも失敗させない。何度ログアウトしてもよいように
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
}

export interface AuthResult {
  sessionToken: string; // Cookie用。応答の本文には入れない
  user: SessionUser;
}

export interface VerifyCodeResult {
  token: string;
  expiresAt: Date;
}
