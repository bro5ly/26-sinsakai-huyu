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
        const user = await this.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                studentId: true,
                serialNumber: true,
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

        console.log('🔍 [ItemRepository.getMyInfo] User from DB:', {
            id: user?.id,
            studentId: user?.studentId,
            serialNumber: user?.serialNumber,
            name: user?.name
        });

        // serialNumberがnullの場合、ExternalUserから取得
        if (user && !user.serialNumber && user.studentId) {
            console.log('⚠️ [getMyInfo] User has no serialNumber, fetching from ExternalUser...');
            const externalUser = await this.db.externalUser.findUnique({
                where: { studentId: user.studentId },
                select: { serialNumber: true }
            });
            if (externalUser?.serialNumber) {
                console.log('✅ [getMyInfo] Found serialNumber in ExternalUser:', externalUser.serialNumber);
                user.serialNumber = externalUser.serialNumber;
            }
        }

        return user;
    }
}