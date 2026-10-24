// 名簿上の種別。名簿の窓口が自分で持ち、このシステムのDB(Prisma)の型には依存しない。
// 学校の名簿の呼び方(「生徒」など)からの変換は、各実装の中で行う
export const rosterUserTypes = ["STUDENT", "FACULTY", "EXTERNAL"] as const;
export type RosterUserType = (typeof rosterUserTypes)[number];

// 学校の名簿の1人分。名前・メール・カードの番号は名簿にだけあり、このシステムのDBには写さない
export interface RosterEntry {
    studentId: string;
    name: string;
    email: string;
    serialNumber: string | null;
    userType: RosterUserType;
    grade: string | null;
    major: string | null;
}

// 名簿の窓口。本番の名簿は学校のDBかAPIになる(docs/backlog.md 0.6)ので、名簿はここを通してだけ読む
export interface Roster {
    findByStudentId(studentId: string): Promise<RosterEntry | null>;
    findBySerialNumber(serialNumber: string): Promise<RosterEntry | null>;
    findManyByStudentIds(studentIds: string[]): Promise<RosterEntry[]>;
}
