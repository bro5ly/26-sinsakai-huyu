// features/auth/auth.types.ts
import type { RosterUserType } from "../roster/roster.js";

// 画面に返す利用者。名前などは名簿から組み立てる。学年・専攻・カードの番号は入れない(docs/api.md 5章 SessionUser)
export interface SessionUser {
    id: string;
    name: string;
    studentId: string;
    userType: RosterUserType;
    role: "MEMBER" | "ADMIN";
}

export interface AuthResult {
    accessToken: string;
    refreshToken: string; // Cookie用。応答の本文には入れない
    user: SessionUser
}

export interface VerifyCodeResult {
    token: string;
    expiresAt: Date;
}
