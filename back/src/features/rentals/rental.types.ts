// features/rentals/rental.types.ts
// 貸し出し・返却の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3、0.8 R8)
import type { RentalStatus } from "./rental.status.js";

// 貸し出せるかの判断(判断表C1〜C3)に要る、物品の分
export interface CheckoutItemRecord {
  id: string;
  status: "AVAILABLE" | "MAINTENANCE" | "LOST" | "DISPOSED";
  hasActiveRental: boolean;
  rentalPeriodDays: number;
}

// 貸し出せるかの判断(判断表C4〜C7)に要る、借りる人の分
export interface BorrowerRecord {
  canBorrow: boolean;
  maxItems: number;
  suspendedUntil: Date | null;
  // 返していない貸し出しの返却期限(延滞と上限を数える)
  activeDueDates: Date[];
}

// 画面に返す貸し出し。物品のバーコードは入れない(実物を持たずに返せてしまうため。2026-10-29 BC1)
export interface RentalRecord {
  id: string;
  rentedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  item: { id: string };
  itemType: { id: string; title: string; genre: { id: string; name: string } };
}

export type RentalView = RentalRecord & { state: RentalStatus };

export interface RentalStore {
  findItemForCheckout(barcode: string): Promise<CheckoutItemRecord | null>;
  findBorrower(userId: string): Promise<BorrowerRecord | null>;
  // 同じ物品の、返していない貸し出しがもうあれば(同時に借りられたとき)、ITEM_ALREADY_RENTED で断る(部分インデックス)
  createRental(data: {
    itemId: string;
    userId: string;
    dueDate: Date;
    rentedAt: Date;
    deviceId: string;
  }): Promise<RentalRecord>;
  // その物品の、返していない貸し出しを返却済みにする。無ければ null
  returnByBarcode(data: { barcode: string; returnedAt: Date; deviceId: string }): Promise<RentalRecord | null>;
}
