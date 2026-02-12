// features/auth/auth.types.ts
import type { User } from "@/generated/prisma/client.js";
export interface AuthResponse {
    accessToken: string;
    refreshToken: string; // Cookie用
    user: Pick<User,"id"|"name"| "userType" | "grade" | "major" | "studentId" | "serialNumber">
}

export interface VerificationResponse {
    message: string;
}

export interface VerifyCodeResponse {
    message: string;
    registrationToken: string;
}