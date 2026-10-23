import { prisma } from "@/lib/prisma.js";

export class ItemRepository {
    constructor(private readonly db = prisma) { }

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

    async getMyInfo(userId: string) {
        return await this.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                studentId: true,
                isActive: true,
                canBorrow: true,
                maxItems: true,
                suspendedUntil: true,
                suspensionReason: true,
                externalUser: {
                    select: {
                        name: true,
                        email: true,
                        serialNumber: true,
                        userType: true,
                        grade: true,
                        major: true,
                    }
                },
                rentals: {
                    where: {
                        returnedAt: null
                    },
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
                        }
                    },
                    orderBy: {
                        rentedAt: 'desc'
                    }
                }
            }
        });
    }
}
