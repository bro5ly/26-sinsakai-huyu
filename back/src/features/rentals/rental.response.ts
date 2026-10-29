import type { Rental } from "@sinsakai/shared";
import type { RentalView } from "./rental.types.js";

// 貸し出しを、画面に返す形(shared/ の Rental)にする。日付は中ではDate、APIの境目でISOの文字列にする(T5)。
// 本人の借りている物(/api/me/rentals)とタブレットの貸し出し・返却で、同じ形を返すために1か所にする
export const toRentalResponse = (rental: RentalView): Rental => ({
    id: rental.id,
    itemType: rental.itemType,
    item: { id: rental.item.id },
    rentedAt: rental.rentedAt.toISOString(),
    dueDate: rental.dueDate.toISOString(),
    returnedAt: rental.returnedAt?.toISOString() ?? null,
    state: rental.state,
});
