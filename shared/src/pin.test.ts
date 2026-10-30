import { describe, expect, it } from "vitest";
import { isGuessablePin } from "@sinsakai/shared/pin";

// 推測しやすいPIN(docs/backlog.md 0.8 P2): 同じ数字の並びと、連続した数字
describe("isGuessablePin(推測しやすいPINか)", () => {
  describe("正常系", () => {
    it.each(["8068", "1357", "2580", "5091"])(
      "PN1 同じ数字の並びでも連続でもない %s のとき、推測しやすくない",
      (pin) => {
        expect(isGuessablePin(pin)).toBe(false);
      },
    );
  });

  describe("異常系", () => {
    it.each(["0000", "1111", "9999"])("PN2 同じ数字の並び %s のとき、推測しやすい", (pin) => {
      expect(isGuessablePin(pin)).toBe(true);
    });

    it.each(["0123", "1234", "6789"])("PN3 1ずつ増える %s のとき、推測しやすい", (pin) => {
      expect(isGuessablePin(pin)).toBe(true);
    });

    it.each(["9876", "4321", "3210"])("PN4 1ずつ減る %s のとき、推測しやすい", (pin) => {
      expect(isGuessablePin(pin)).toBe(true);
    });
  });

  describe("境界値", () => {
    it.each(["1112", "0111"])("PN5 3つだけ同じ数字の %s のとき、推測しやすいに入れない", (pin) => {
      expect(isGuessablePin(pin)).toBe(false);
    });

    it.each(["1235", "5431"])("PN6 途中まで連続の %s のとき、推測しやすいに入れない", (pin) => {
      expect(isGuessablePin(pin)).toBe(false);
    });

    // P2は1ずつ増える・減るだけで、9から0へは回り込まない
    it.each(["7890", "8901", "1098"])("PN7 9から0へ回り込む %s のとき、連続に入れない", (pin) => {
      expect(isGuessablePin(pin)).toBe(false);
    });
  });
});
