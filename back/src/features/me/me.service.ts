import { DomainError } from "@/lib/domain-error.js";
import type { Roster } from "@/features/roster/roster.js";
import { rentalStatus } from "@/features/rentals/rental.status.js";
import type { RentalView } from "@/features/rentals/rental.types.js";
import type { PasswordHasher } from "@/lib/password.js";
import type { MeStore, MeUserRecord, MeView } from "./me.types.js";

type Parts = { me: MeStore; roster: Roster; passwords: PasswordHasher };

// ログイン中の本人の情報(docs/api.md 4.2)。「今」は外から渡し、延滞の境目をテストできるようにする
export class MeService {
  private readonly me: MeStore;
  private readonly roster: Roster;
  private readonly passwords: PasswordHasher;

  constructor(parts: Parts) {
    this.me = parts.me;
    this.roster = parts.roster;
    this.passwords = parts.passwords;
  }

  async getMe(userId: string, now: Date): Promise<MeView> {
    const user = await this.findUser(userId);
    // 名簿から消えた人(卒業など)は、登録が残っていても通さない(docs/spec.md Q13)
    const entry = await this.roster.findByStudentId(user.studentId);
    if (!entry) throw new DomainError("UNAUTHENTICATED");

    const rentals = await this.me.findActiveRentalsByUserId(user.id);
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
    const rentals = await this.me.findActiveRentalsByUserId(user.id);
    return rentals.map((rental) => ({ ...rental, state: rentalStatus(rental, now) }));
  }

  // PINは本人だと示すものなので、変える前にパスワードで本人を確かめ直す(共用のPCでログインしたまま離れた人のPINを、他人が変えられないように。P1)。
  // 推測しやすいPIN・4桁でないPINは、入力の検証(shared/src/me.ts)で先に断っている
  async setPin(input: { userId: string; pin: string; password: string }): Promise<void> {
    const passwordHash = await this.me.findPasswordHashByUserId(input.userId);
    if (!passwordHash) throw new DomainError("UNAUTHENTICATED");
    if (!(await this.passwords.matches({ plain: input.password, hash: passwordHash }))) {
      throw new DomainError("WRONG_PASSWORD");
    }

    // 4桁は1万通りしかなく、DBが漏れればハッシュから総当たりで分かる。守りはタブレットでのロックと端末の登録(docs/auth.md R-A5)
    await this.me.savePin({ userId: input.userId, pinHash: await this.passwords.hash(input.pin) });
  }

  // トークンは正しくても、利用者が消されていることがある
  private async findUser(userId: string): Promise<MeUserRecord> {
    const user = await this.me.findUserById(userId);
    if (!user) throw new DomainError("UNAUTHENTICATED");
    return user;
  }
}
