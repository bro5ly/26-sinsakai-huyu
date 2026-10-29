import type { SessionStore } from "@/features/auth/auth.types.js";
import { rentalStatus } from "@/features/rentals/rental.status.js";
import type { Roster } from "@/features/roster/roster.js";
import { DomainError } from "@/lib/domain-error.js";
import type { PasswordHasher } from "@/lib/password.js";
import { hashToken, type SecretSource } from "@/lib/session-token.js";
import { afterPinAttempt, checkCardHolder, checkTabletSession, TABLET_SESSION_MS } from "./tablet-session.check.js";
import type { ActiveRentalReader, CardHolderStore, StartedTabletSession } from "./tablet-session.types.js";

type Parts = {
  roster: Roster;
  cardHolders: CardHolderStore;
  sessions: SessionStore;
  rentals: ActiveRentalReader;
  passwords: PasswordHasher;
  secrets: SecretSource;
};

// タブレットでの本人確認(docs/auth.md 4.2〜4.5、判断表T)。番号の作り方とDBの表はWebのセッションと同じで、種類だけ TABLET(A8-3・A8-5)
export class TabletSessionService {
  private readonly roster: Roster;
  private readonly cardHolders: CardHolderStore;
  private readonly sessions: SessionStore;
  private readonly rentals: ActiveRentalReader;
  private readonly passwords: PasswordHasher;
  private readonly secrets: SecretSource;

  constructor(parts: Parts) {
    this.roster = parts.roster;
    this.cardHolders = parts.cardHolders;
    this.sessions = parts.sessions;
    this.rentals = parts.rentals;
    this.passwords = parts.passwords;
    this.secrets = parts.secrets;
  }

  // カードとPINを1回で受け取る。カードだけでは何も分からないようにするため(R-A12)
  async start(input: { cardNumber: string; pin: string; deviceId: string }, now: Date): Promise<StartedTabletSession> {
    const entry = await this.roster.findBySerialNumber(input.cardNumber);
    const holder = entry ? await this.cardHolders.findCardHolderByStudentId(entry.studentId) : null;
    const check = checkCardHolder(holder, entry !== null);
    if (!check.ok || !entry) throw new DomainError(check.ok ? "INVALID_CARD_OR_PIN" : check.reason);

    const matched = await this.passwords.matches({ plain: input.pin, hash: check.holder.pinHash });
    const attempt = afterPinAttempt(check.holder.pinFailedAttempts, matched, now);
    if (!attempt.ok) {
      await this.cardHolders.savePinAttempt({
        userId: check.holder.id,
        failedAttempts: attempt.failedAttempts,
        lockedAt: attempt.lockedAt,
      });
      throw new DomainError(attempt.reason);
    }
    if (check.holder.pinFailedAttempts > 0) {
      await this.cardHolders.savePinAttempt({ userId: check.holder.id, failedAttempts: 0, lockedAt: null });
    }

    const token = this.secrets.newToken();
    const expiresAt = new Date(now.getTime() + TABLET_SESSION_MS);
    await this.sessions.createSession({
      tokenHash: hashToken(token),
      userId: check.holder.id,
      kind: "TABLET",
      expiresAt,
      deviceId: input.deviceId,
    });

    const active = await this.rentals.findActiveRentalsByUserId(check.holder.id);
    return {
      token,
      expiresAt,
      displayName: entry.name,
      rentals: active.map((rental) => ({
        title: rental.itemType.title,
        dueDate: rental.dueDate,
        state: rentalStatus(rental, now),
      })),
    };
  }

  // 通ったら、最後に使った日時を書き換える(無操作30秒を数え直す。R-A9)
  async authenticate(
    input: { token: string | undefined; deviceId: string },
    now: Date,
  ): Promise<{ id: string; role: "MEMBER" | "ADMIN" }> {
    if (!input.token) throw new DomainError("UNAUTHENTICATED");
    const tokenHash = hashToken(input.token);
    const result = checkTabletSession(await this.sessions.findSessionByTokenHash(tokenHash), input.deviceId, now);
    if (!result.ok) throw new DomainError(result.reason);
    await this.sessions.saveSessionLastUsedAt(tokenHash, now);
    return result.user;
  }

  // 「終わる」・完了の表示から10秒で、すぐ無効にする(立ち去った人の名前で次の人が借りられないように。R-A10)
  async end(token: string): Promise<void> {
    await this.sessions.deleteSessionByTokenHash(hashToken(token));
  }
}
