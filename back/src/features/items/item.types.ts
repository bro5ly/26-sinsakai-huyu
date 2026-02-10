import { Prisma } from "@/generated/prisma/client.js";

export type ItemWithDetail = Prisma.ItemGetPayload<{
    include: {
        itemType: true
    }
}>;