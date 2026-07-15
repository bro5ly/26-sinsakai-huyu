// features/auth/auth.schema.ts
import { z } from "zod";

// 学籍番号の共通ルール（例：8桁の数字など）
export const studentIdSchema = z
  .string()
  .min(1, "学籍番号を入力してください")
  .regex(/^\d+$/, "数字のみで入力してください");


// 学籍番号の共通ルール（例：8桁の数字など）
export const codeSchema = z
  .string()
  .length(6, "認証コードは6桁で入力してください")
  .regex(/^\d+$/, "数字のみで入力してください");

// ログインや検証リクエストで使い回す
export const requestVerificationSchema = z.object({
  studentId: studentIdSchema,
});

export const codeVerificationSchema = z.object({
  studentId: studentIdSchema,
  code: codeSchema
});

// Signup用（パスワード等も一緒に定義）
export const signupSchema = z.object({
  plainPassword: z.string().min(8, "パスワードは8文字以上必要です"),
  registrationToken: z.string().min(1, "トークンが不正です"),
});

export const loginSchema = z.object({
  plainPassword: z.string().min(8, "パスワードは8文字以上必要です"),
  studentId: studentIdSchema,
});

// Serviceの型をここから抽出
export type SignupInput = z.infer<typeof signupSchema>;
export type loginInput = z.infer<typeof loginSchema>