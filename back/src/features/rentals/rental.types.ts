// 貸し出し・返却の中の型。Prismaの型はrepositoryの中だけで使い、serviceはここの名前の付いた型だけを見る(docs/backlog.md 0.7 T1〜T3、0.8 R8、0.9)
import type { RentalStatus } from "./rental.status.js";

// 貸し出せるかの判断(判断表C1〜C3)に要る、物品の分(C2 修理中などを、C3 貸出中より先に見る。2026-10-30 B1)
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

// 画面に返す貸し出し。本人の借りている物(me)も同じ形を使う(D3)。物品のバーコードは入れない(実物を持たずに返せてしまうため。2026-10-29 BC1)
export interface RentalRecord {
  id: string;
  rentedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  item: { id: string };
  itemType: { id: string; title: string; genre: { id: string; name: string } };
}

export type RentalView = RentalRecord & { state: RentalStatus };

// repositoryに渡す入力(0.9 M3)
export interface NewRental {
  itemId: string;
  userId: string;
  dueDate: Date;
  rentedAt: Date;
  deviceId: string;
}

export interface RentalReturn {
  barcode: string;
  returnedAt: Date;
  deviceId: string;
}

export interface RentalStore {
  findCheckoutItemByBarcode(barcode: string): Promise<CheckoutItemRecord | null>;
  findBorrowerById(userId: string): Promise<BorrowerRecord | null>;
  // 同じ物品の、返していない貸し出しがもうあれば(同時に借りられたとき。部分インデックスで分かる)、null を返す。
  // 断るかどうかはserviceが決める(0.9 D2)
  createRental(data: NewRental): Promise<RentalRecord | null>;
  // その物品の、返していない貸し出しを返却済みにする。無ければ null
  saveReturnByBarcode(data: RentalReturn): Promise<RentalRecord | null>;
}
