import { prisma } from "@/lib/prisma.js";

export class ItemRepository {
    constructor(private readonly db = prisma){}
}