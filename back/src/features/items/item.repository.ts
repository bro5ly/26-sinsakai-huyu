import type { PrismaClient } from "@/generated/prisma/client.js";

export class ItemRepository {
    constructor(private readonly db: PrismaClient) { }

    async findAll() {
        return await this.db.item.findMany({
            include: {
                itemType: {
                    include: {
                        genre: {
                            include: {
                                category: true
                            }
                        }
                    }
                },
                rentals: {
                    where: { returnedAt: null },
                    select: { id: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }
}
