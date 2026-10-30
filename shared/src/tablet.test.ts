import { describe, expect, it } from "vitest";
import { createTabletSessionRequestSchema, tabletItemRequestSchema } from "@sinsakai/shared/tablet";

// 入力のスキーマは、画面とサーバーの両方が使う(docs/backlog.md 0.10 TS5)
const firstMessage = (result: { error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe("createTabletSessionRequestSchema(カードとPIN)", () => {
  describe("正常系", () => {
    it("TB1 カードの番号の前後の空白は落として通す(読み取り機が改行や空白を付けることがあるため)", () => {
      expect(createTabletSessionRequestSchema.parse({ cardNumber: " IC-CARD-001\n", pin: "8068" })).toEqual({
        cardNumber: "IC-CARD-001",
        pin: "8068",
      });
    });
  });

  describe("異常系", () => {
    it("TB2 カードの番号が空白だけのとき、「カードを読ませてください」で断る", () => {
      expect(firstMessage(createTabletSessionRequestSchema.safeParse({ cardNumber: "  ", pin: "8068" }))).toBe(
        "カードを読ませてください",
      );
    });
  });

  describe("境界値", () => {
    it.each(["123", "12345", "１２３４"])("TB3 PINが %s(4桁の半角数字でない)のとき、断る", (pin) => {
      expect(firstMessage(createTabletSessionRequestSchema.safeParse({ cardNumber: "IC-CARD-001", pin }))).toBe(
        "PINは4桁の数字で入力してください",
      );
    });
  });
});

describe("tabletItemRequestSchema(借りる・返す物品のバーコード)", () => {
  describe("正常系", () => {
    it("TB4 バーコードがあるとき、通す", () => {
      expect(tabletItemRequestSchema.parse({ barcode: "MAC-002" })).toEqual({ barcode: "MAC-002" });
    });
  });

  describe("異常系", () => {
    it("TB5 バーコードが空のとき、「バーコードは必須です」で断る", () => {
      expect(firstMessage(tabletItemRequestSchema.safeParse({ barcode: "" }))).toBe("バーコードは必須です");
    });
  });
});
