import { UserType, ItemStatus, Role } from "../src/generated/prisma/client.js";
import { createPrisma } from "../src/lib/prisma.js";
import { getConfig } from "../src/config.js";
import bcrypt from "bcrypt";

const prisma = createPrisma(getConfig().databaseUrl);

async function main() {
  console.log("🌱 Seeding database...");

  // 既存のデータを削除（初期化したい場合）
  // リレーションの逆順で削除
  await prisma.rental.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemTypeGenre.deleteMany();
  await prisma.itemType.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.category.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.tabletDevice.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.externalUser.deleteMany();

  console.log("🗑️  Cleaned up existing data");

  // ========== External Users(名簿) ==========
  // 20260001・20260002・99990001は未登録(新規登録の確かめ用)。20240001〜003は下で登録済みにする
  const externalUsers = [
    {
      studentId: "20260001",
      name: "テスト 太郎",
      email: "your-email@example.com",
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
      userType: UserType.FACULTY,
      grade: null,
      major: "教務部",
      serialNumber: "SN-ADMIN",
    },
    {
      studentId: "20240001",
      name: "山田 太郎",
      email: "yamada@example.com",
      userType: UserType.STUDENT,
      grade: "2年",
      major: "情報工学科",
      serialNumber: "IC-CARD-001",
    },
    {
      studentId: "20240002",
      name: "佐藤 花子",
      email: "sato@example.com",
      userType: UserType.STUDENT,
      grade: "3年",
      major: "デザイン学科",
      serialNumber: "IC-CARD-002",
    },
    {
      studentId: "20240003",
      name: "鈴木 次郎",
      email: "suzuki@example.com",
      userType: UserType.STUDENT,
      grade: "1年",
      major: "機械工学科",
      serialNumber: "IC-CARD-003",
    },
    {
      studentId: "90240001",
      name: "高橋 先生",
      email: "takahashi@example.com",
      userType: UserType.FACULTY,
      grade: null,
      major: "情報工学科",
      serialNumber: "IC-CARD-ADMIN",
    },
  ];

  for (const user of externalUsers) {
    await prisma.externalUser.create({ data: user });
  }
  console.log("✅ External users created");

  // ========== Users (タブレット認証用) ==========
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.create({
    data: { studentId: "20240001", passwordHash: hashedPassword },
  });

  const user2 = await prisma.user.create({
    data: { studentId: "20240002", passwordHash: hashedPassword },
  });

  await prisma.user.create({
    data: { studentId: "20240003", passwordHash: hashedPassword, maxItems: 3 },
  });

  await prisma.user.create({
    data: { studentId: "90240001", passwordHash: hashedPassword, role: Role.ADMIN },
  });

  console.log("✅ Users created");

  // ========== Categories ==========
  const electronicsCategory = await prisma.category.create({
    data: {
      name: "電子機器",
      description: "パソコン、タブレット、周辺機器など",
    },
  });

  const booksCategory = await prisma.category.create({
    data: {
      name: "書籍",
      description: "専門書、参考書、雑誌など",
    },
  });

  await prisma.category.create({
    data: {
      name: "実験器具",
      description: "測定器、工具、実験用品など",
    },
  });

  console.log("✅ Categories created");

  // ========== Genres ==========
  const laptopGenre = await prisma.genre.create({
    data: {
      categoryId: electronicsCategory.id,
      name: "ノートパソコン",
      description: "持ち運び可能なPC",
    },
  });

  const tabletGenre = await prisma.genre.create({
    data: {
      categoryId: electronicsCategory.id,
      name: "タブレット",
      description: "iPad、Androidタブレットなど",
    },
  });

  const cameraGenre = await prisma.genre.create({
    data: {
      categoryId: electronicsCategory.id,
      name: "カメラ",
      description: "デジタルカメラ、ビデオカメラなど",
    },
  });

  const techBookGenre = await prisma.genre.create({
    data: {
      categoryId: booksCategory.id,
      name: "技術書",
      description: "プログラミング、工学関連書籍",
    },
  });

  console.log("✅ Genres created");

  // ========== Item Types ==========
  const macbookType = await prisma.itemType.create({
    data: {
      genreId: laptopGenre.id,
      title: "MacBook Pro 16インチ",
      description: "M3 Pro搭載、メモリ32GB、SSD 1TB",
      manufacturer: "Apple",
      model: "MRW13J/A",
      rentalPeriodDays: 7,
      imageUrl: "/images/macbook-pro.jpg",
    },
  });

  const iPadType = await prisma.itemType.create({
    data: {
      genreId: tabletGenre.id,
      title: "iPad Pro 12.9インチ",
      description: "第6世代、Wi-Fi、256GB",
      manufacturer: "Apple",
      model: "MNXQ3J/A",
      rentalPeriodDays: 7,
      imageUrl: "/images/ipad-pro.jpg",
    },
  });

  const cameraType = await prisma.itemType.create({
    data: {
      genreId: cameraGenre.id,
      title: "Canon EOS R6 Mark II",
      description: "ミラーレス一眼カメラ、レンズキット付き",
      manufacturer: "Canon",
      model: "EOS R6 Mark II",
      rentalPeriodDays: 3,
      imageUrl: "/images/canon-eos.jpg",
    },
  });

  const pythonBookType = await prisma.itemType.create({
    data: {
      genreId: techBookGenre.id,
      title: "Python機械学習プログラミング",
      description: "scikit-learn、Keras、TensorFlowによる実践",
      author: "Sebastian Raschka",
      publisher: "インプレス",
      isbn: "978-4295013365",
      rentalPeriodDays: 14,
      imageUrl: "/images/python-ml-book.jpg",
    },
  });

  console.log("✅ Item types created");

  // ========== Items (個別の在庫) ==========
  const items = [
    // MacBook Pro (3台)
    { itemTypeId: macbookType.id, barcode: "MAC-001", location: "A棟-2F-101", status: ItemStatus.AVAILABLE },
    { itemTypeId: macbookType.id, barcode: "MAC-002", location: "A棟-2F-101", status: ItemStatus.AVAILABLE },
    { itemTypeId: macbookType.id, barcode: "MAC-003", location: "A棟-2F-101", status: ItemStatus.AVAILABLE },

    // iPad Pro (5台)
    { itemTypeId: iPadType.id, barcode: "IPAD-001", location: "A棟-2F-102", status: ItemStatus.AVAILABLE },
    { itemTypeId: iPadType.id, barcode: "IPAD-002", location: "A棟-2F-102", status: ItemStatus.AVAILABLE },
    { itemTypeId: iPadType.id, barcode: "IPAD-003", location: "A棟-2F-102", status: ItemStatus.AVAILABLE },
    { itemTypeId: iPadType.id, barcode: "IPAD-004", location: "A棟-2F-102", status: ItemStatus.AVAILABLE },
    { itemTypeId: iPadType.id, barcode: "IPAD-005", location: "A棟-2F-102", status: ItemStatus.MAINTENANCE },

    // Canon Camera (2台)
    { itemTypeId: cameraType.id, barcode: "CAM-001", location: "B棟-1F-機材室", status: ItemStatus.AVAILABLE },
    { itemTypeId: cameraType.id, barcode: "CAM-002", location: "B棟-1F-機材室", status: ItemStatus.AVAILABLE },

    // Python Books (10冊)
    { itemTypeId: pythonBookType.id, barcode: "BOOK-PY-001", location: "図書室-3F-プ", status: ItemStatus.AVAILABLE },
    { itemTypeId: pythonBookType.id, barcode: "BOOK-PY-002", location: "図書室-3F-プ", status: ItemStatus.AVAILABLE },
    { itemTypeId: pythonBookType.id, barcode: "BOOK-PY-003", location: "図書室-3F-プ", status: ItemStatus.AVAILABLE },
    { itemTypeId: pythonBookType.id, barcode: "BOOK-PY-004", location: "図書室-3F-プ", status: ItemStatus.AVAILABLE },
    { itemTypeId: pythonBookType.id, barcode: "BOOK-PY-005", location: "図書室-3F-プ", status: ItemStatus.AVAILABLE },
  ];

  for (const item of items) {
    await prisma.item.create({ data: item });
  }

  console.log("✅ Items created");

  // ========== テスト用の貸出レコード（既に借りている状態） ==========
  const macItem = await prisma.item.findFirst({ where: { barcode: "MAC-001" } });
  const iPadItem = await prisma.item.findFirst({ where: { barcode: "IPAD-001" } });

  if (macItem && iPadItem) {
    // user1がMacBookを借りている状態
    const rentedAt = new Date();
    const dueDate = new Date(rentedAt);
    dueDate.setDate(dueDate.getDate() + 7);

    await prisma.rental.create({
      data: { itemId: macItem.id, userId: user1.id, rentedAt, dueDate },
    });

    // user2がiPadを借りている状態
    await prisma.rental.create({
      data: { itemId: iPadItem.id, userId: user2.id, rentedAt, dueDate },
    });

    console.log("✅ Test rentals created");
  }

  console.log("✨ All seed data created successfully!");
  console.log("\n📝 Test accounts:");
  console.log("  Student 1: IC-CARD-001 (山田 太郎) - MacBook借りてる");
  console.log("  Student 2: IC-CARD-002 (佐藤 花子) - iPad借りてる");
  console.log("  Student 3: IC-CARD-003 (鈴木 次郎) - 何も借りてない(上限3)");
  console.log("  Admin:     90240001 / IC-CARD-ADMIN (高橋 先生) - 管理者");
  console.log("  パスワードはすべて password123");
  console.log("\n🔖 Test barcodes:");
  console.log("  MacBooks: MAC-001 (貸出中), MAC-002, MAC-003");
  console.log("  iPads: IPAD-001 (貸出中), IPAD-002, IPAD-003, IPAD-004");
  console.log("  Cameras: CAM-001, CAM-002");
  console.log("  Books: BOOK-PY-001 ~ 005");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
