import { prisma } from "@/lib/prisma.js";

export class ItemRepository {
    constructor(private readonly db = prisma) { }

    async findAll() {
        return this.db.item.findMany({
            include: {
                itemType: true,
            }
        })
    }
}