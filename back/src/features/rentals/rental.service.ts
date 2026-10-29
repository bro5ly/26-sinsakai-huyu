import { DomainError } from "@/lib/domain-error.js";
import type { RentalRepository } from "./rental.repository.js";
import { rentalStatus } from "./rental.status.js";

// テストで偽物を渡せるように、使うメソッドだけに絞った型で受け取る
export type RentalStore = Pick<RentalRepository, "findByBarcode" | "saveCheckout" | "saveReturned">

export class RentalService {
    constructor(private rentalRepository: RentalStore){}
    checkoutItem = async (userId: string, barcode: string) => {

        const item = await this.rentalRepository.findByBarcode(barcode);
        if(!item) throw new DomainError('ITEM_NOT_FOUND')
        const period = item.itemType.rentalPeriodDays ?? 7
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + period)
        const rental = await this.rentalRepository.saveCheckout(userId,barcode,dueDate)
        return { message: '貸し出しが完了しました', data: {...rental, status: rentalStatus(rental, new Date())} }
    }

    returnItem = async (barcode: string) => {
        const returnInfo = await this.rentalRepository.saveReturned(barcode)
        return { message: '返却が完了しました', data: {...returnInfo, status: rentalStatus(returnInfo, new Date())} }
    }
}