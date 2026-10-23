import { AppError } from "@/lib/error.js";
import { prisma } from "@/lib/prisma.js";


export class RentalRepository {
    constructor (private readonly db = prisma){}
    async findUserWithActiveRentals(studentId: string){
        return await this.db.user.findUnique({
            where: {studentId},
            select:{
                id: true,
                studentId: true,
                rentals:{
                    where: {returnedAt: null},
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
        const activeRental = await this.db.rental.findFirst({
            where: {
                item: {barcode},
                returnedAt: null
            },
            select: {
                id: true
            }
        })
        if(!activeRental) throw new AppError('この物品の貸し出しデータが見つかりません',404,'ACTIVE_RENTAL_NOT_FOUND')

        return await this.db.rental.update({
            where: {id: activeRental.id},
            data: {
                returnedAt: new Date()
            },
            include: {
                item: {
                    include: {
                        itemType: true
                    }
                }
            }
        })
    }

    async saveCheckout(userId: string,barcode: string, dueDate: Date){
        return await this.db.$transaction(async (tx) => {
            const item = await tx.item.findUnique({
                where: {barcode},
                include: {
                    rentals: {
                        where: {returnedAt: null},
                        select: {id: true}
                    }
                }
            })
            if(!item) {
                throw new AppError('貸し出し不可能な物品です',400,'ITEM_NOT_AVAILABLE')
            }

            if (item.rentals.length > 0) {
                throw new AppError('貸し出し中の物品です',409,'ITEM_NOT_AVAILABLE')
            }

            if (item.status !== "AVAILABLE")  {
                throw new AppError('貸し出し不可能な物品です',400,'ITEM_NOT_AVAILABLE')
            }

            // 同時に借りられたときは、部分インデックス(返却されていない貸し出しは物1つにつき1件)でここが失敗する
            return await tx.rental.create({
                data: {
                    itemId: item.id,
                    userId,
                    dueDate,
                },
                include: {
                    item: {
                        include: {
                            itemType: true
                        }
                    }
                }
            })
        })
    }

}
