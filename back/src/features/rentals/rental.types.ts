import { Prisma } from "@/generated/prisma/client.js";

export type RentalWithDetails = Prisma.RentalGetPayload<{
    include: {
        item: {
            include: {
                itemType: {
                    include: {
                        genre: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        },
        user: true
    }
}>;

export type RentalBasic = Prisma.RentalGetPayload<{
    include: {
        item: true
    }
}>;
