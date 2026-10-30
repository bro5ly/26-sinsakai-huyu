import type { Roster, RosterEntry } from "@/features/roster/roster.js";
import { DomainError } from "@/lib/domain-error.js";
import type { Mailer } from "@/lib/mail.js";
import type { PasswordHasher } from "@/lib/password.js";
import { hashToken, sameHash, type SecretSource } from "@/lib/session-token.js";
import { afterCodeAttempt, afterLoginAttempt, isLoginLocked } from "./attempt.check.js";
import type {
  AuthResult,
  SessionStore,
  UserRecord,
  UserStore,
  VerificationCodeStore,
  VerifyCodeResult,
} from "./auth.types.js";

// 登録用トークンの期限。応答の expiresAt もこれから作る
const REGISTRATION_TOKEN_MINUTES = 15;
// 認証コードの期限(R-4)
const CODE_MINUTES = 15;
// Webのセッションは、作ってから7日で必ず切れる。使っても延ばさない(docs/backlog.md 0.8 A8-6)
export const WEB_SESSION_DAYS = 7;

type Parts = {
  users: UserStore;
  verificationCodes: VerificationCodeStore;
  sessions: SessionStore;
  mailer: Mailer;
  roster: Roster;
  passwords: PasswordHasher;
  secrets: SecretSource;
};

// 登録・ログイン・ログアウト(docs/spec.md UC-1・UC-2)。「今」は外から渡し、期限の境目をテストできるようにする
export class AuthService {
  private readonly users: UserStore;
  private readonly verificationCodes: VerificationCodeStore;
  private readonly sessions: SessionStore;
  private readonly mailer: Mailer;
  private readonly roster: Roster;
  private readonly passwords: PasswordHasher;
  private readonly secrets: SecretSource;

  constructor(parts: Parts) {
    this.users = parts.users;
    this.verificationCodes = parts.verificationCodes;
    this.sessions = parts.sessions;
    this.mailer = parts.mailer;
    this.roster = parts.roster;
    this.passwords = parts.passwords;
    this.secrets = parts.secrets;
  }

  // 名簿にいない・登録済みでも、成功と同じに終え、何も送らない(学籍番号があるか・登録済みかを知られないため。R-16・auth.md 4.6)
  async requestVerification(studentId: string, now: Date): Promise<void> {
    const student = await this.roster.findByStudentId(studentId);
    if (!student) return;
    if (await this.users.findUserByStudentId(studentId)) return;

    // DBにはハッシュだけを置く(docs/auth.md 4.6)
    const code = this.secrets.newCode();
    const expiresAt = new Date(now.getTime() + CODE_MINUTES * 60 * 1000);
    await this.verificationCodes.saveCode({ studentId: student.studentId, codeHash: hashToken(code), expiresAt });
    try {
      await this.mailer.sendCode({ to: student.email, code });
    } catch (err) {
      // 送れなくても、成功と同じに終える。名簿にいる番号だけ500になると、名簿にいるかが分かってしまうため(R-2)。
      // 利用者は申請し直せばよい。ログには種類だけを出し、宛先(メールアドレス)は出さない
      console.error("[MAIL_FAILED]", err instanceof Error ? err.name : typeof err);
    }
  }

  // 無い・期限切れ・使用済み(A8-8)・違う、はどれも同じに断る。5回間違えたらコードを消し、申請し直させる(R-8)
  async verifyCode(input: { studentId: string; code: string }, now: Date): Promise<VerifyCodeResult> {
    const { studentId } = input;
    const record = await this.verificationCodes.findCodeByStudentId(studentId);
    const matched = record !== null && sameHash(record.codeHash, hashToken(input.code));
    const attempt = afterCodeAttempt(record, matched, now);
    if (!attempt.ok) {
      if (attempt.action === "count") {
        await this.verificationCodes.saveCodeAttempts({ studentId, attempts: attempt.attempts });
      }
      if (attempt.action === "invalidate") await this.verificationCodes.deleteCodeByStudentId(studentId);
      throw new DomainError("INVALID_CODE");
    }

    // 登録用トークンはDBにハッシュだけを置き、登録で1回使ったら行ごと消す(JWTと違い、1回だけにできる。A8-8)
    const token = this.secrets.newToken();
    // 画面が「あと何分で手続きが切れるか」を出せるように、期限も返す(docs/api.md 4.1)
    const expiresAt = new Date(now.getTime() + REGISTRATION_TOKEN_MINUTES * 60 * 1000);
    await this.verificationCodes.saveRegistrationToken({ studentId, tokenHash: hashToken(token), expiresAt });
    return { token, expiresAt };
  }

  async signUp(input: { token: string; password: string }, now: Date): Promise<AuthResult> {
    // でたらめ・使用済み(行ごと消してある)・期限切れは、どれも同じに断る
    const record = await this.verificationCodes.findRegistrationTokenByHash(hashToken(input.token));
    if (!record || !record.tokenExpiresAt || now >= record.tokenExpiresAt) throw new DomainError("INVALID_TOKEN");
    const { studentId } = record;

    if (await this.users.findUserByStudentId(studentId)) throw new DomainError("ALREADY_REGISTERED");
    const entry = await this.roster.findByStudentId(studentId);
    if (!entry) throw new DomainError("INVALID_TOKEN");

    const user = await this.users.createUser({ studentId, passwordHash: await this.passwords.hash(input.password) });
    await this.verificationCodes.deleteCodeByStudentId(studentId);
    return this.createSession(user, entry, now);
  }

  async login(input: { studentId: string; password: string }, now: Date): Promise<AuthResult> {
    const { user, entry } = await this.verifyCredentials(input, now);
    return this.createSession(user, entry, now);
  }

  // 学籍番号とパスワードで本人を確かめる。ログインと、タブレットの端末の登録(管理者がその場で確かめる。D2)が使う。
  // 学籍番号が無い・パスワード違い・無効な人・名簿から消えた、のどれかは言わない(R-16・R-A14)。
  // 続けて5回間違えたら15分止める(F1。端末の登録も同じパスワードを試せるので、同じ回数で数える)
  async verifyCredentials(
    input: { studentId: string; password: string },
    now: Date,
  ): Promise<{ user: UserRecord; entry: RosterEntry }> {
    const user = await this.users.findUserByStudentId(input.studentId);
    if (!user) throw new DomainError("INVALID_CREDENTIALS");
    if (isLoginLocked(user.loginLockedUntil, now)) throw new DomainError("RATE_LIMITED");

    const matched = await this.passwords.matches({ plain: input.password, hash: user.passwordHash });
    const attempt = afterLoginAttempt(user.loginFailedAttempts, matched, now);
    // 合ったときは、数えていたときだけ書く(ふだんのログインでDBに書かないように)
    if (!attempt.ok || user.loginFailedAttempts > 0 || user.loginLockedUntil) {
      await this.users.saveLoginAttempt({
        userId: user.id,
        failedAttempts: attempt.failedAttempts,
        lockedUntil: attempt.lockedUntil,
      });
    }
    if (!attempt.ok) throw new DomainError(attempt.reason);
    if (!user.isActive) throw new DomainError("INVALID_CREDENTIALS");

    // 名簿から消えた人(卒業など)は、ここで止める。セッションの途中では名簿を見ない(A8-10)
    const entry = await this.roster.findByStudentId(user.studentId);
    if (!entry) throw new DomainError("INVALID_CREDENTIALS");
    return { user, entry };
  }

  // Cookieを消すだけでは、盗まれた番号が期限(7日)まで使えるので、DBからも消す(R-15)。無ければ何もしない
  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.sessions.deleteSessionByTokenHash(hashToken(sessionToken));
  }

  // 番号そのものはCookieにだけ入れ、DBにはハッシュだけを置く。ログインのたびに別のセッションを作る(ほかの端末のログインは切らない。Q9)
  private async createSession(user: UserRecord, profile: RosterEntry, now: Date): Promise<AuthResult> {
    const sessionToken = this.secrets.newToken();
    await this.sessions.createSession({
      tokenHash: hashToken(sessionToken),
      userId: user.id,
      kind: "WEB",
      expiresAt: new Date(now.getTime() + WEB_SESSION_DAYS * 24 * 60 * 60 * 1000),
    });
    return {
      sessionToken,
      // 学年・専攻・カードの番号は入れない(画面は /api/me で取る。docs/api.md 5章 SessionUser)
      user: { id: user.id, name: profile.name, studentId: user.studentId, userType: profile.userType, role: user.role },
    };
  }
}
