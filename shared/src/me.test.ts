import { describe, expect, it } from "vitest";
import { setPinRequestSchema } from "@sinsakai/shared/me";

// 入力のスキーマは、画面とサーバーの両方が使う(docs/backlog.md 0.10 TS5)
const messages = (input: unknown) => setPinRequestSchema.safeParse(input).error?.issues.map((i) => i.message) ?? [];

describe("setPinRequestSchema(PINの登録)", () => {
  describe("正常系", () => {
    it("SP1 推測しにくい4桁の数字とパスワードがあるとき、通す", () => {
      expect(messages({ pin: "8068", password: "password123" })).toEqual([]);
    });
  });

  describe("異常系", () => {
    it.each(["1111", "1234", "4321"])("SP2 推測しやすい %s のとき、連続した数字などは使えないと断る(P2)", (pin) => {
      expect(messages({ pin, password: "password123" })).toEqual([
        "同じ数字の並びや、連続した数字(1234など)は使えません",
      ]);
    });

    it("SP3 パスワードが空のとき、「パスワードを入力してください」で断る(P1)", () => {
      expect(messages({ pin: "8068", password: "" })).toEqual(["パスワードを入力してください"]);
    });
  });

  describe("境界値", () => {
    // 4桁の数字でないときは、推測しやすいかを見ない(2つの注意が重ねて出ないように)
    it.each(["123", "12345", "12a4"])("SP4 %s(4桁の数字でない)のとき、4桁の注意だけを出す", (pin) => {
      expect(messages({ pin, password: "password123" })).toEqual(["PINは4桁の数字で入力してください"]);
    });
  });
});
