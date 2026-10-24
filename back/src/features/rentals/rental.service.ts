import { DomainError } from "@/lib/domain-error.js";
import type { RentalRepository } from "./rental.repository.js";
import type { Roster } from "../roster/roster.js";
import { signTabletToken } from "@/lib/jwt.js";
import { rentalStatus } from "./rental.status.js";

// テストで偽物を渡せるように、使うメソッドだけに絞った型で受け取る
export type RentalStore = Pick<RentalRepository, "findUserWithActiveRentals" | "findByBarcode" | "saveCheckout" | "saveReturned">

export class RentalService {
    constructor(private rentalRepository: RentalStore, private roster: Roster){}
    signInWithIc = async (serialNumber: string) => {
        const entry = await this.roster.findBySerialNumber(serialNumber)
        if(!entry) throw new DomainError('INVALID_CARD_OR_PIN')
        const data = await this.rentalRepository.findUserWithActiveRentals(entry.studentId)
        if(!data) throw new DomainError('INVALID_CARD_OR_PIN')
        const now = new Date()
        return {
            message: '認証に成功しました',
            session: await this.generateSession(data.id),
            user: {
                id: data.id,
                studentId: data.studentId,
                name: entry.name,
                grade: entry.grade,
                major: entry.major
            },
            data: data.rentals.map((rental) => ({...rental, status: rentalStatus(rental, now)}))
        }
    }

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

    async generateSession(userId: string){
        return signTabletToken({sub: userId, role: 'TABLET_USER'})
    }

}