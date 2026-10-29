import bcrypt from "bcrypt";
import { DomainError } from "@/lib/domain-error.js";
import type { Roster } from "@/features/roster/roster.js";
import { rentalStatus } from "@/features/rentals/rental.status.js";
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
            borrowing: {
                canBorrow: user.canBorrow,
                maxItems: user.maxItems,
                suspendedUntil: user.suspendedUntil,
                activeCount: rentals.length,
                hasOverdue: rentals.some((rental) => rentalStatus(rental, now) === "OVERDUE"),
            },
            pin: user.pin,
        };
    }

    async getMyRentals(userId: string, now: Date): Promise<RentalView[]> {
        const user = await this.findUser(userId);
        const rentals = await this.store.findActiveRentals(user.id);
        return rentals.map((rental) => ({ ...rental, state: rentalStatus(rental, now) }));
    }

    // PINは本人だと示すものなので、変える前にパスワードで本人を確かめ直す(共用のPCでログインしたまま離れた人のPINを、他人が変えられないように。P1)。
    // 推測しやすいPIN・4桁でないPINは、入力の検証(shared/src/me.ts)で先に断っている
    async setPin(userId: string, input: { pin: string; password: string }): Promise<void> {
        const passwordHash = await this.store.findPasswordHash(userId);
        if (!passwordHash) throw new DomainError("UNAUTHENTICATED");
        if (!(await bcrypt.compare(input.password, passwordHash))) throw new DomainError("WRONG_PASSWORD");

        // 4桁は1万通りしかなく、DBが漏れればハッシュから総当たりで分かる。守りはタブレットでのロックと端末の登録(docs/auth.md R-A5)
        await this.store.savePin({ userId, pinHash: await bcrypt.hash(input.pin, 10) });
    }

    // トークンは正しくても、利用者が消されていることがある
    private async findUser(userId: string): Promise<MeUserRecord> {
        const user = await this.store.findUser(userId);
        if (!user) throw new DomainError("UNAUTHENTICATED");
        return user;
    }
}
