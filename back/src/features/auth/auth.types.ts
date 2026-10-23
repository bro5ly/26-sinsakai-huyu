// features/auth/auth.types.ts
import type { UserType } from "@/generated/prisma/enums.js";

// 画面に返す利用者。名前などは名簿(ExternalUser)から組み立てる
export interface SessionUser {
    id: string;
    name: string;
    userType: UserType;
    grade: string | null;
    major: string | null;
    studentId: string;
    serialNumber: string | null;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string; // Cookie用
    user: SessionUser
}

export interface VerificationResponse {
    message: string;
}

export interface VerifyCodeResponse {
    message: string;
    registrationToken: string;
}
