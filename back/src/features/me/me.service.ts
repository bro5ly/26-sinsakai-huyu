import { DomainError } from "@/lib/domain-error.js";
import type { Roster } from "../roster/roster.js";
import { rentalStatus } from "../rentals/rental.status.js";
import type { MeStore, MeUserRecord, MeView, RentalView } from "./me.types.js";

// ログイン中の本人の情報(docs/api.md 4.2)。「今」は外から渡し、延滞の境目をテストできるようにする
export class MeService {
    constructor(private readonly store: MeStore, private readonly roster: Roster) {}

    async getMe(userId: string, now: Date): Promise<MeView> {
        const user = await this.findUser(userId);
        // 名簿から消えた人(卒業など)は、登録が残っていても通さない(docs/spec.md Q13)
        const entry = await this.roster.findByStudentId(user.studentId);
        if (!entry) throw new DomainError("UNAUTHENTICATED");

        const rentals = await this.store.findActiveRentals(user.id);
        return {
            id: user.id,
            name: entry.name,
            studentId: user.studentId,
            userType: entry.userType,
            role: user.role,
            email: entry.email,
            grade: entry.grade,
            major: entry.major,
            cardNumber: entry.serialNumber,
            borrowing: {
                canBorrow: user.canBorrow,
                maxItems: user.maxItems,
                suspendedUntil: user.suspendedUntil,
                activeCount: rentals.length,
                hasOverdue: rentals.some((rental) => rentalStatus(rental, now) === "OVERDUE"),
            },
        };
    }

    async getMyRentals(userId: string, now: Date): Promise<RentalView[]> {
        const user = await this.findUser(userId);
        const rentals = await this.store.findActiveRentals(user.id);
        return rentals.map((rental) => ({ ...rental, state: rentalStatus(rental, now) }));
    }

    // トークンは正しくても、利用者が消されていることがある
    private async findUser(userId: string): Promise<MeUserRecord> {
        const user = await this.store.findUser(userId);
        if (!user) throw new DomainError("UNAUTHENTICATED");
        return user;
    }
}
