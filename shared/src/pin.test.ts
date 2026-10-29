import { describe, expect, it } from "vitest";
import { isGuessablePin } from "@sinsakai/shared/pin";

// 推測しやすいPIN(docs/backlog.md 0.8 P2): 同じ数字の並びと、連続した数字
describe("isGuessablePin(推測しやすいPINか)", () => {
    describe("正常系", () => {
        it("PN1 同じ数字の並びでも連続でもなければ、推測しやすくない", () => {
            for (const pin of ["8068", "1357", "2580", "5091"]) expect(isGuessablePin(pin)).toBe(false);
        });
    });

    describe("異常系", () => {
        it("PN2 同じ数字の並び(0000・1111・9999)は、推測しやすい(P2)", () => {
            for (const pin of ["0000", "1111", "9999"]) expect(isGuessablePin(pin)).toBe(true);
        });

        it("PN3 1ずつ増える数字(0123・1234・6789)は、推測しやすい(P2)", () => {
            for (const pin of ["0123", "1234", "6789"]) expect(isGuessablePin(pin)).toBe(true);
        });

        it("PN4 1ずつ減る数字(9876・4321・3210)は、推測しやすい(P2)", () => {
            for (const pin of ["9876", "4321", "3210"]) expect(isGuessablePin(pin)).toBe(true);
        });
    });

    describe("境界値", () => {
        it("PN5 3つだけ同じ数字(1112・0111)は、推測しやすいに入れない", () => {
            for (const pin of ["1112", "0111"]) expect(isGuessablePin(pin)).toBe(false);
        });

        it("PN6 途中まで連続(1235・5431)は、推測しやすいに入れない", () => {
            for (const pin of ["1235", "5431"]) expect(isGuessablePin(pin)).toBe(false);
        });

        it("PN7 9から0へ回り込む並び(7890・8901・1098)は、連続に入れない(P2は1ずつ増える・減るだけ)", () => {
            for (const pin of ["7890", "8901", "1098"]) expect(isGuessablePin(pin)).toBe(false);
        });
    });
});
