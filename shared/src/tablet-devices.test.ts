import { describe, expect, it } from "vitest";
import { registerTabletDeviceRequestSchema } from "@sinsakai/shared/tablet-devices";

// 入力のスキーマは、画面とサーバーの両方が使う(docs/backlog.md 0.10 TS5)
const valid = { studentId: "90240001", password: "password123", name: "図書室入口" };
const firstMessage = (input: unknown) => registerTabletDeviceRequestSchema.safeParse(input).error?.issues[0]?.message;

describe("registerTabletDeviceRequestSchema(端末の登録)", () => {
  describe("正常系", () => {
    it("SD1 名前の前後の空白は落として通す", () => {
      expect(registerTabletDeviceRequestSchema.parse({ ...valid, name: " 図書室入口 " }).name).toBe("図書室入口");
    });
  });

  describe("異常系", () => {
    it("SD2 名前が空白だけのとき、「端末の名前を入力してください」で断る", () => {
      expect(firstMessage({ ...valid, name: "   " })).toBe("端末の名前を入力してください");
    });
  });

  describe("境界値", () => {
    it("SD3 名前が50文字のとき、通す", () => {
      expect(firstMessage({ ...valid, name: "あ".repeat(50) })).toBeUndefined();
    });

    it("SD4 名前が51文字のとき、「端末の名前は50文字までにしてください」で断る", () => {
      expect(firstMessage({ ...valid, name: "あ".repeat(51) })).toBe("端末の名前は50文字までにしてください");
    });
  });
});
