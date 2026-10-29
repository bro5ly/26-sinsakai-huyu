import { DomainError } from "@/lib/domain-error.js";
import { canCheckout } from "./rental.check.js";
import { rentalStatus } from "./rental.status.js";
import type { RentalStore, RentalView } from "./rental.types.js";

// タブレットでの貸し出しと返却(docs/spec.md UC-8・UC-9)。「今」は外から渡し、期限と延滞の境目をテストできるようにする
export class RentalService {
  constructor(private readonly store: RentalStore) {}

  // 読む → 判断表Cで判断 → 書く(2026-10-29 E6)。同じ物品を同時に借りられたときは、DBの部分インデックスが2件目を断る
  async checkout(input: { userId: string; barcode: string; deviceId: string }, now: Date): Promise<RentalView> {
    const [item, borrower] = await Promise.all([
      this.store.findItemForCheckout(input.barcode),
      this.store.findBorrower(input.userId),
    ]);
    const result = canCheckout(item, borrower, now);
    if (!result.ok || !item) throw new DomainError(result.ok ? "ITEM_NOT_FOUND" : result.reason);

    const rental = await this.store.createRental({
      itemId: item.id,
      userId: input.userId,
      dueDate: result.dueDate,
      rentedAt: now,
      deviceId: input.deviceId,
    });
    return { ...rental, state: rentalStatus(rental, now) };
  }

  // 返却は本人でなくてよい(物が戻ってきたことを優先する。Q3・A-Q4)。どの端末で返したかは記録する(E3)
  async returnItem(input: { barcode: string; deviceId: string }, now: Date): Promise<RentalView> {
    const rental = await this.store.returnByBarcode({
      barcode: input.barcode,
      returnedAt: now,
      deviceId: input.deviceId,
    });
    if (!rental) throw new DomainError("ACTIVE_RENTAL_NOT_FOUND");
    return { ...rental, state: rentalStatus(rental, now) };
  }
}
