import {UserType } from "../src/generated/prisma/client";
import {prisma} from "../src/lib/prisma"




async function main() {
  console.log("🌱 Seeding database...");

  // 既存のデータを削除（初期化したい場合）
  await prisma.externalUser.deleteMany();

  const externalUsers = [
    {
      studentId: "20260001",
      name: "テスト 太郎",
      email: "your-email@example.com", // ここを自分のMailtrap等で受信できるアドレスに
      userType: UserType.STUDENT,
      grade: "3年",
      major: "情報工学科",
      serialNumber: "SN-001",
    },
    {
      studentId: "20260002",
      name: "テスト 花子",
      email: "hanako@example.com",
      userType: UserType.STUDENT,
      grade: "2年",
      major: "デザイン学科",
      serialNumber: "SN-002",
    },
    {
      studentId: "99990001",
      name: "管理者 先生",
      email: "admin@example.com",
      userType: UserType.ADMIN,
      grade: null,
      major: "教務部",
      serialNumber: "SN-ADMIN",
    },
  ];

  for (const user of externalUsers) {
    await prisma.externalUser.upsert({
      where: { studentId: user.studentId },
      update: {},
      create: user,
    });
  }

  console.log("✅ Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });