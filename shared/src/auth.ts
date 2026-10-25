import { z } from "zod";

// 登録・ログイン(Web)の6本のリクエストと応答の形(docs/api.md 4.1・5章)。サーバーは入力の検証に、画面は型に使う

// 学籍番号は数字だけ。カードの番号(英字を含む)と取り違えないため
export const studentIdSchema = z
    .string()
    .min(1, "学籍番号を入力してください")
    .regex(/^\d+$/, "数字のみで入力してください");

const passwordSchema = z.string().min(8, "パスワードは8文字以上必要です");

// パスワードの再設定("password-reset")は0.8で足す(2026-10-25 A2)
const purposeSchema = z.literal("signup");

// POST /api/verification-codes → 202(本文なし。名簿にいてもいなくても同じ)
export const verificationCodeRequestSchema = z.object({
    studentId: studentIdSchema,
    purpose: purposeSchema,
});

// POST /api/verification-tokens → 201 VerificationToken
export const verificationTokenRequestSchema = z.object({
    studentId: studentIdSchema,
    purpose: purposeSchema,
    code: z.string().length(6, "認証コードは6桁で入力してください").regex(/^\d+$/, "数字のみで入力してください"),
});
export const verificationTokenSchema = z.object({
    token: z.string(),
    expiresAt: z.iso.datetime(),
});

// POST /api/users → 201 Session
export const createUserRequestSchema = z.object({
    token: z.string().min(1, "手続きの期限が切れました。最初からやり直してください"),
    password: passwordSchema,
});

// POST /api/sessions → 201 Session
export const createSessionRequestSchema = z.object({
    studentId: studentIdSchema,
    password: passwordSchema,
});

// ログイン中の利用者。学年・専攻・カードの番号は入れない(本人の情報は /api/me で取る)
export const sessionUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    studentId: z.string(),
    userType: z.enum(["STUDENT", "FACULTY", "EXTERNAL"]),
    role: z.enum(["MEMBER", "ADMIN"]),
});

// POST /api/users・POST /api/sessions(201)・POST /api/sessions/refresh(200)。リフレッシュトークンは本文に入れず、HttpOnly Cookieにだけ入れる
export const sessionSchema = z.object({
    user: sessionUserSchema,
    accessToken: z.string(),
});

export type VerificationCodeRequest = z.infer<typeof verificationCodeRequestSchema>;
export type VerificationTokenRequest = z.infer<typeof verificationTokenRequestSchema>;
export type VerificationToken = z.infer<typeof verificationTokenSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
