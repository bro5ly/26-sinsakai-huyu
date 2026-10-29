import type { Prisma } from "@/generated/prisma/client.js";
import type { RentalRecord } from "./rental.types.js";

// 画面に返す貸し出しを読む形。貸し出し・返却(rentals)と本人の借りている物(me)の両方が使い、1か所で決める(docs/backlog.md 0.9 D3)。
// 物品のバーコードは読まない(実物を持たずに返却できてしまうため。BC1)
export const rentalSelect = {
  id: true,
  rentedAt: true,
  dueDate: true,
  returnedAt: true,
  item: {
    select: { id: true, itemType: { select: { id: true, title: true, genre: { select: { id: true, name: true } } } } },
  },
} as const;

type RentalRow = Prisma.RentalGetPayload<{ select: typeof rentalSelect }>;

// 画面の形(Rental)に合わせ、種類を物品の外に出す
export const toRentalRecord = ({ item: { itemType, ...item }, ...rental }: RentalRow): RentalRecord => ({
  ...rental,
  item,
  itemType,
});
