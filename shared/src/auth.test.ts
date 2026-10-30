import { describe, expect, it } from "vitest";
import {
  createSessionRequestSchema,
  createUserRequestSchema,
  studentIdSchema,
  verificationCodeRequestSchema,
  verificationTokenRequestSchema,
} from "@sinsakai/shared/auth";

// 入力のスキーマは、画面とサーバーの両方が使う(docs/backlog.md 0.10 TS5)。
// 断るときは、画面に出す文言(最初の1つ)まで確かめる
const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("studentIdSchema(学籍番号)", () => {
  describe("正常系", () => {
    it.each(["20240001", "90240001", "1"])("SC1 数字だけの %s は通す", (studentId) => {
      expect(studentIdSchema.safeParse(studentId).success).toBe(true);
    });
  });

  describe("異常系", () => {
    // カードの番号(英字を含む)と取り違えないため、数字だけにしている
    it.each([
      { input: "IC-CARD-001", message: "数字のみで入力してください" },
      { input: "2024 0001", message: "数字のみで入力してください" },
      { input: "２０２４０００１", message: "数字のみで入力してください" },
      { input: "", message: "学籍番号を入力してください" },
    ])("SC2 「$input」は「$message」で断る", ({ input, message }) => {
      expect(firstMessage(studentIdSchema.safeParse(input))).toBe(message);
    });
  });
});

describe("verificationCodeRequestSchema(認証コードの申請)", () => {
  describe("正常系", () => {
    it("SC3 学籍番号と用途 signup があるとき、通す", () => {
      const input = { studentId: "20260001", purpose: "signup" };

      expect(verificationCodeRequestSchema.parse(input)).toEqual(input);
    });
  });

  describe("異常系", () => {
    it("SC4 用途が signup でないとき、断る", () => {
      const result = verificationCodeRequestSchema.safeParse({ studentId: "20260001", purpose: "password-reset" });

      expect(result.success).toBe(false);
    });
  });
});

describe("verificationTokenRequestSchema(認証コードを確かめる)", () => {
  const valid = { studentId: "20260001", purpose: "signup", code: "123456" };

  describe("正常系", () => {
    it("SC5 6桁の数字のコードのとき、通す", () => {
      expect(verificationTokenRequestSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("SC6 数字でない文字があるとき、「数字のみで入力してください」で断る", () => {
      expect(firstMessage(verificationTokenRequestSchema.safeParse({ ...valid, code: "12345a" }))).toBe(
        "数字のみで入力してください",
      );
    });
  });

  describe("境界値", () => {
    it.each(["12345", "1234567"])("SC7 %s(6桁でない)のとき、「認証コードは6桁で入力してください」で断る", (code) => {
      expect(firstMessage(verificationTokenRequestSchema.safeParse({ ...valid, code }))).toBe(
        "認証コードは6桁で入力してください",
      );
    });
  });
});

describe("createUserRequestSchema(登録)", () => {
  describe("異常系", () => {
    it("SC8 登録用トークンが空のとき、「手続きの期限が切れました。最初からやり直してください」で断る", () => {
      expect(firstMessage(createUserRequestSchema.safeParse({ token: "", password: "password123" }))).toBe(
        "手続きの期限が切れました。最初からやり直してください",
      );
    });
  });

  describe("境界値", () => {
    it("SC9 パスワードが8文字のとき、通す", () => {
      expect(createUserRequestSchema.safeParse({ token: "t", password: "abcd1234" }).success).toBe(true);
    });

    it("SC10 パスワードが7文字のとき、「パスワードは8文字以上必要です」で断る", () => {
      expect(firstMessage(createUserRequestSchema.safeParse({ token: "t", password: "abcd123" }))).toBe(
        "パスワードは8文字以上必要です",
      );
    });
  });
});

describe("createSessionRequestSchema(ログイン)", () => {
  describe("境界値", () => {
    // 長さはログインでは見ない。短く打ち間違えた人だけ文言が分かれないように(2026-10-25 B1-A)
    it("SC11 パスワードが1文字のとき、通す", () => {
      expect(createSessionRequestSchema.safeParse({ studentId: "20240001", password: "a" }).success).toBe(true);
    });

    it("SC12 パスワードが空のとき、「パスワードを入力してください」で断る", () => {
      expect(firstMessage(createSessionRequestSchema.safeParse({ studentId: "20240001", password: "" }))).toBe(
        "パスワードを入力してください",
      );
    });
  });
});
