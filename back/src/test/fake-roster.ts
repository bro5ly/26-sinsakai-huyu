import type { Roster, RosterEntry } from "@/features/roster/roster.js";

// テスト用の名簿。DBを使わずに「名簿にいる・いない」を作る
export class FakeRoster implements Roster {
  constructor(private readonly entries: RosterEntry[] = []) {}

  async findByStudentId(studentId: string) {
    return this.entries.find((e) => e.studentId === studentId) ?? null;
  }

  async findBySerialNumber(serialNumber: string) {
    return this.entries.find((e) => e.serialNumber === serialNumber) ?? null;
  }

  async findManyByStudentIds(studentIds: string[]) {
    return this.entries.filter((e) => studentIds.includes(e.studentId));
  }
}

export const rosterEntry = (overrides: Partial<RosterEntry> = {}): RosterEntry => ({
  studentId: "20240003",
  name: "鈴木 次郎",
  email: "suzuki@example.com",
  serialNumber: "IC-CARD-003",
  userType: "STUDENT",
  grade: "1年",
  major: "機械工学科",
  ...overrides,
});

// 使わない依存の代わり。呼ばれたらテストが落ちる
export const notUsed = (): never => {
  throw new Error("このテストでは呼ばれないはず");
};
