import { DomainError } from "@/lib/domain-error.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { PrismaClient } from "@/generated/prisma/client.js";
import type { BorrowerRecord, CheckoutItemRecord, RentalRecord, RentalStore } from "./rental.types.js";

// 画面に返す貸し出しの形。物品のバーコードは読まない(BC1)
const rentalSelect = {
    id: true,
    rentedAt: true,
    dueDate: true,
    returnedAt: true,
    item: { select: { id: true, itemType: { select: { id: true, title: true, genre: { select: { id: true, name: true } } } } } },
} as const;

type RentalRow = Prisma.RentalGetPayload<{ select: typeof rentalSelect }>;

// 画面の形(RentalRecord)に合わせ、種類を物品の外に出す
const toRecord = ({ item: { itemType, ...item }, ...rental }: RentalRow): RentalRecord => ({ ...rental, item, itemType });

// 貸し出し・返却の読み書きだけ。貸し出せるかの判断は rental.check.ts(2026-10-29 E6)
export class RentalRepository implements RentalStore {
    constructor(private readonly db: PrismaClient) {}

    async findItemForCheckout(barcode: string): Promise<CheckoutItemRecord | null> {
        const row = await this.db.item.findUnique({
            where: { barcode },
            select: { id: true, status: true, rentals: { where: { returnedAt: null }, select: { id: true } }, itemType: { select: { rentalPeriodDays: true } } },
        });
        if (!row) return null;
        return { id: row.id, status: row.status, hasActiveRental: row.rentals.length > 0, rentalPeriodDays: row.itemType.rentalPeriodDays };
    }

    async findBorrower(userId: string): Promise<BorrowerRecord | null> {
        const row = await this.db.user.findUnique({
            where: { id: userId },
            select: { canBorrow: true, maxItems: true, suspendedUntil: true, rentals: { where: { returnedAt: null }, select: { dueDate: true } } },
        });
        if (!row) return null;
        const { rentals, ...rest } = row;
        return { ...rest, activeDueDates: rentals.map((rental) => rental.dueDate) };
    }

    async createRental(data: { itemId: string; userId: string; dueDate: Date; rentedAt: Date; deviceId: string }): Promise<RentalRecord> {
        try {
            const row = await this.db.rental.create({
                data: { itemId: data.itemId, userId: data.userId, dueDate: data.dueDate, rentedAt: data.rentedAt, rentedDeviceId: data.deviceId },
                select: rentalSelect,
            });
            return toRecord(row);
        } catch (err) {
            // 同時に借りられたときは、部分インデックス(返却されていない貸し出しは物1つにつき1件)でここが失敗する
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new DomainError("ITEM_ALREADY_RENTED");
            throw err;
        }
    }

    // 返していない貸し出しを探して返却済みにするまでを、1つのトランザクションで行う(2台で同時に返したときに二重に書かないため)
    async returnByBarcode(data: { barcode: string; returnedAt: Date; deviceId: string }): Promise<RentalRecord | null> {
        return this.db.$transaction(async (tx) => {
            const active = await tx.rental.findFirst({ where: { item: { barcode: data.barcode }, returnedAt: null }, select: { id: true } });
            if (!active) return null;
            const row = await tx.rental.update({
                where: { id: active.id },
                data: { returnedAt: data.returnedAt, returnedDeviceId: data.deviceId },
                select: rentalSelect,
            });
            return toRecord(row);
        });
    }
}
