import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
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

// 行の型は select から作る(手で書くと select を変えたときにずれる。0.9 M4)
type Row = Prisma.ExternalUserGetPayload<{ select: typeof entrySelect }>;

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
