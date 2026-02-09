import { AppError } from "@/lib/error.js";
import { prisma } from "@/lib/prisma.js";


export class RentalRepository {
    constructor (private readonly db = prisma){}
    async findBySerialNumber(id: string){
        return await this.db.user.findFirst({
            where: {serialNumber: id},
            select:{
                id: true,
                studentId: true,
                name: true,
                grade: true,
                major: true,
                rentals:{
                    where: {status: "RENTING"},
                    include:{
                        item: {
                            include:{
                                itemType: true
                            }
                        }
                    }
                }
            },
        })
    }


    async findByBarcode(barcode: string) {
        return await this.db.item.findFirst({
            where: {barcode},
            select:{
                id: true,
                itemType:{
                    select:{
                        rentalPeriodDays: true,
                    }
                }
            }
        })
    }

    async saveReturned(barcode: string){
        return await this.db.$transaction(async (tx) => {
            const activeRental = await tx.rental.findFirst({
                where: {
                    item: {barcode},
                    status: "RENTING"
                },
                select: {
                    id: true,
                    itemId: true
                }
            })
            if(!activeRental) throw new AppError('この物品の貸し出しデータが見つかりません',404,'ACTIVE_RENTAL_NOT_FOUND')
            
            const updatedRental = await tx.rental.update({
                where: {id: activeRental.id},
                data: {
                    status: "RETURNED",
                    returnedAt: new Date()
                }
            })

            await tx.item.update({
                where: {id: activeRental.itemId},
                data: {
                    status: "AVAILABLE"
                }
            })

            return updatedRental
        })


    }

    async saveCheckout(userId: string,barcode: string, dueDate: Date){
        return await this.db.$transaction(async (tx) => {
            const item = await tx.item.findUnique({
                where: {barcode}
            })
            if(!item || item?.status !== "AVAILABLE") {
                throw new AppError('貸し出しふのう貸し出し不可能な物品です',400,'ITEM_NOT_AVAILABLE')
            }
            const rental = await tx.rental.create({
                data: {
                    itemId: item.id,
                    userId,
                    dueDate,
                    status: 'RENTING',
                }
            })

            await tx.item.update({
                where:{id: item.id},
                data:{
                    status: "RENTED",

                }
            })
            return rental
        })
    }

}