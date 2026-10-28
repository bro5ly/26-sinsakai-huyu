// features/auth/auth.types.ts
import type { SessionUser } from "@sinsakai/shared";

export interface AuthResult {
    sessionToken: string; // Cookie用。応答の本文には入れない
    user: SessionUser
}

export interface VerifyCodeResult {
    token: string;
    expiresAt: Date;
}
