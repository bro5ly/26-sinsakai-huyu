import { Prisma, type PrismaClient } from "@/generated/prisma/client.js";
import { rentalSelect, toRentalRecord } from "./rental.select.js";
import type {
  BorrowerRecord,
  CheckoutItemRecord,
  NewRental,
  RentalRecord,
  RentalReturn,
  RentalStore,
} from "./rental.types.js";

const checkoutItemSelect = {
  id: true,
  status: true,
  rentals: { where: { returnedAt: null }, select: { id: true } },
  itemType: { select: { rentalPeriodDays: true } },
} as const;

const borrowerSelect = {
  canBorrow: true,
  maxItems: true,
  suspendedUntil: true,
  rentals: { where: { returnedAt: null }, select: { dueDate: true } },
} as const;

// 貸し出し・返却の読み書きだけ。貸し出せるかの判断は rental.check.ts(2026-10-29 E6)、断るのは service(0.9 D2)
export class RentalRepository implements RentalStore {
  constructor(private readonly db: PrismaClient) {}

  async findCheckoutItemByBarcode(barcode: string): Promise<CheckoutItemRecord | null> {
    const row = await this.db.item.findUnique({ where: { barcode }, select: checkoutItemSelect });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      hasActiveRental: row.rentals.length > 0,
      rentalPeriodDays: row.itemType.rentalPeriodDays,
    };
  }

  async findBorrowerById(userId: string): Promise<BorrowerRecord | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: borrowerSelect });
    if (!row) return null;
    const { rentals, ...rest } = row;
    return { ...rest, activeDueDates: rentals.map((rental) => rental.dueDate) };
  }

  async createRental(data: NewRental): Promise<RentalRecord | null> {
    try {
      const row = await this.db.rental.create({
        data: {
          itemId: data.itemId,
          userId: data.userId,
          dueDate: data.dueDate,
          rentedAt: data.rentedAt,
          rentedDeviceId: data.deviceId,
        },
        select: rentalSelect,
      });
      return toRentalRecord(row);
    } catch (err) {
      // 同時に借りられたときは、部分インデックス(返却されていない貸し出しは物1つにつき1件)でここが失敗する
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
      throw err;
    }
  }

  // 返していない貸し出しを探して返却済みにするまでを、1つのトランザクションで行う(2台で同時に返したときに二重に書かないため)
  async saveReturnByBarcode(data: RentalReturn): Promise<RentalRecord | null> {
    return this.db.$transaction(async (tx) => {
      const active = await tx.rental.findFirst({
        where: { item: { barcode: data.barcode }, returnedAt: null },
        select: { id: true },
      });
      if (!active) return null;
      const row = await tx.rental.update({
        where: { id: active.id },
        data: { returnedAt: data.returnedAt, returnedDeviceId: data.deviceId },
        select: rentalSelect,
      });
      return toRentalRecord(row);
    });
  }
}
