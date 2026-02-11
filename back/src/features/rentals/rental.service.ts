import { AppError } from "@/lib/error.js";
import type { RentalRepository } from "./rental.repository.js";
import { signTabletToken } from "@/lib/jwt.js";

export class RentalService {
    constructor(private rentalRepository: RentalRepository){}
    signInWithIc = async (serialNumber: string) => {
        const data = await this.rentalRepository.findBySerialNumber(serialNumber)
        if(!data) throw new AppError('認証に失敗しました', 401, 'AUTH_FAILED')
        return {
            message: '認証に成功しました',
            session: await this.generateSession(data.id),
            user: {
                id: data.id,
                studentId: data.studentId,
                name: data.name,
                grade: data.grade,
                major: data.major
            },
            data: data.rentals
        }
    }

    checkoutItem = async (userId: string, barcode: string) => {

        const item = await this.rentalRepository.findByBarcode(barcode);
        if(!item) throw new AppError('指定されたバーコードの物品が見つかりません',404,'ITEM_NOT_FOUND' )
        const period = item.itemType.rentalPeriodDays ?? 7
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + period)
        const rental = await this.rentalRepository.saveCheckout(userId,barcode,dueDate)
        if(!rental) throw new AppError('貸し出しに失敗しました',400,'RENT_FAILED')
        return { message: '貸し出しが完了しました', data: rental }
    }

    returnItem = async (barcode: string) => {
        const returnInfo = await this.rentalRepository.saveReturned(barcode)
        if(!returnInfo) throw new AppError('返却に失敗しました',400,'RETURN_FAILED')
        return { message: '返却が完了しました', data: returnInfo }
    }

    async generateSession(userId: string){
        return signTabletToken({sub: userId, role: 'TABLET_USER'})
    }

}