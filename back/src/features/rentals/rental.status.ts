import type { ItemStatus } from "@/generated/prisma/enums.js";

// DBは状態の列を持たないので、APIで返す状態はここで決める(docs/spec.md 6章)
export type RentalStatus = "RENTING" | "RETURNED" | "OVERDUE";
export type ItemAvailability = ItemStatus | "RENTED";

export const rentalStatus = (rental: { returnedAt: Date | null; dueDate: Date }, now: Date): RentalStatus => {
    if (rental.returnedAt) return "RETURNED";
    if (rental.dueDate < now) return "OVERDUE";
    return "RENTING";
};

// 修理中・紛失・廃棄は貸出中より優先する(物そのものが使えないことを先に伝えるため)
export const itemAvailability = (status: ItemStatus, hasActiveRental: boolean): ItemAvailability => {
    if (status !== "AVAILABLE") return status;
    return hasActiveRental ? "RENTED" : "AVAILABLE";
};
