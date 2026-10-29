import type { PrismaClient } from "@/generated/prisma/client.js";
import type { UserType } from "@/generated/prisma/enums.js";
import type { Roster, RosterEntry, RosterUserType } from "./roster.js";

const entrySelect = {
  studentId: true,
  name: true,
  email: true,
  serialNumber: true,
  userType: true,
  grade: true,
  major: true,
} as const;

// 表で対応させる。どちらかの種別が増えたら、ここが型チェックで落ちる
const toRosterUserType: Record<UserType, RosterUserType> = {
  STUDENT: "STUDENT",
  FACULTY: "FACULTY",
  EXTERNAL: "EXTERNAL",
};

type Row = {
  studentId: string;
  name: string;
  email: string;
  serialNumber: string | null;
  userType: UserType;
  grade: string | null;
  major: string | null;
};

const toEntry = (row: Row): RosterEntry => ({ ...row, userType: toRosterUserType[row.userType] });

// 仮の名簿(external_user表)を読む実装。学校のDB・APIの実装ができたら、組み立てを差し替える
export class PrismaRoster implements Roster {
  constructor(private readonly db: PrismaClient) {}

  async findByStudentId(studentId: string): Promise<RosterEntry | null> {
    const row = await this.db.externalUser.findUnique({ where: { studentId }, select: entrySelect });
    return row ? toEntry(row) : null;
  }

  async findBySerialNumber(serialNumber: string): Promise<RosterEntry | null> {
    const row = await this.db.externalUser.findUnique({ where: { serialNumber }, select: entrySelect });
    return row ? toEntry(row) : null;
  }

  async findManyByStudentIds(studentIds: string[]): Promise<RosterEntry[]> {
    const rows = await this.db.externalUser.findMany({ where: { studentId: { in: studentIds } }, select: entrySelect });
    return rows.map(toEntry);
  }
}
