import { describe, it } from "vitest";

// テストは開発者が書く(CLAUDE.md)。決まりは docs/spec.md の6章(延滞 = 未返却で返却期限が今より前)
describe("rentalStatus(貸し出しの状態)", () => {
  describe("正常系", () => {
    it.todo("S1 返却日時が入っていれば、返却済み(RETURNED)");
    it.todo("S2 未返却で返却期限が明日なら、貸出中(RENTING)");
    it.todo("S3 未返却で返却期限が昨日なら、延滞(OVERDUE)");
  });
  describe("境界値", () => {
    it.todo("S4 未返却で返却期限がちょうど今なら、貸出中(RENTING)");
    it.todo("S5 未返却で返却期限が今の1ミリ秒前なら、延滞(OVERDUE)");
    it.todo("S6 返却日時が入っていれば、返却期限を過ぎていても返却済み(RETURNED)");
  });
});

describe("itemAvailability(物品の状態)", () => {
  describe("正常系", () => {
    it.todo("I1 使える物で貸出中の記録が無ければ、貸し出し可能(AVAILABLE)");
    it.todo("I2 使える物で貸出中の記録があれば、貸出中(RENTED)");
  });
  describe("異常系", () => {
    it.todo("I3 修理中なら、貸出中の記録があっても修理中(MAINTENANCE)");
    it.todo("I4 紛失・廃棄なら、そのまま(LOST・DISPOSED)");
  });
});
