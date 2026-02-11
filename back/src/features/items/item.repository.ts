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
                name: true,
                email: true,
                grade: true,
                major: true,
                userType: true,
                isActive: true,
                rentalSetting: true,
                rentals: {
                    where: {
                        status: 'RENTING'
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