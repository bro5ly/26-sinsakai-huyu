import { DomainError } from "@/lib/domain-error.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { PrismaClient } from "@/generated/prisma/client.js";


export class RentalRepository {
    constructor (private readonly db: PrismaClient){}
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
        if(!activeRental) throw new DomainError('ACTIVE_RENTAL_NOT_FOUND')

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
                throw new DomainError('ITEM_NOT_FOUND')
            }

            if (item.rentals.length > 0) {
                throw new DomainError('ITEM_ALREADY_RENTED')
            }

            if (item.status !== "AVAILABLE")  {
                throw new DomainError('ITEM_UNAVAILABLE')
            }

            // 同時に借りられたときは、部分インデックス(返却されていない貸し出しは物1つにつき1件)でここが失敗する
            try {
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
            } catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                    throw new DomainError('ITEM_ALREADY_RENTED')
                }
                throw err
            }
        })
    }

}
