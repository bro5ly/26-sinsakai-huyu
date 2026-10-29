import type { Roster, RosterEntry } from "@/features/roster/roster.js";
import { DomainError } from "@/lib/domain-error.js";
import { hashToken, sameHash } from "@/lib/session-token.js";
import { afterCodeAttempt, afterLoginAttempt, isLoginLocked } from "./attempt.check.js";
import type {
  AuthResult,
  CodeStore,
  Mailer,
  PasswordHasher,
  SecretSource,
  SessionStore,
  UserRecord,
  UserStore,
  VerifyCodeResult,
} from "./auth.types.js";

// 登録用トークンの期限。応答の expiresAt もこれから作る
const REGISTRATION_TOKEN_MINUTES = 15;
// 認証コードの期限(R-4)
const CODE_MINUTES = 15;
// Webのセッションは、作ってから7日で必ず切れる。使っても延ばさない(docs/backlog.md 0.8 A8-6)
export const WEB_SESSION_DAYS = 7;

export class AuthService {
  private readonly users: UserStore;
  private readonly authRepository: CodeStore;
  private readonly sessions: SessionStore;
  private readonly mailService: Mailer;
  private readonly roster: Roster;
  private readonly passwords: PasswordHasher;
  private readonly secrets: SecretSource;

  // 部品が多いので、取り違えないように名前付きで受け取る(docs/backlog.md 0.7 T4)。時計(now)は呼ぶたびに渡す
  constructor(parts: {
    users: UserStore;
    codes: CodeStore;
    sessions: SessionStore;
    mailer: Mailer;
    roster: Roster;
    passwords: PasswordHasher;
    secrets: SecretSource;
  }) {
    this.users = parts.users;
    this.authRepository = parts.codes;
    this.sessions = parts.sessions;
    this.mailService = parts.mailer;
    this.roster = parts.roster;
    this.passwords = parts.passwords;
    this.secrets = parts.secrets;
  }

  requestVerification = async (studentId: string, now: Date): Promise<void> => {
    //1. 受け取った学籍番号が別dbにあるか確認
    // 名簿にいない・登録済みでも、成功と同じ応答を返し、何も送らない(学籍番号があるか・登録済みかを知られないため。R-16・auth.md 4.6)
    const student = await this.roster.findByStudentId(studentId);
    if (!student) return;

    const existsUser = await this.users.findByStudentId(studentId);
    if (existsUser) return;
    //2. 存在する場合、dbからemailを取得
    //3. コードを作成してemailに送信
    // DBにはハッシュだけを置く(docs/auth.md 4.6)
    const verificationCode = this.secrets.newCode();
    const expiresAt = new Date(now.getTime() + CODE_MINUTES * 60 * 1000);
    await this.authRepository.saveTmpCode({
      codeHash: hashToken(verificationCode),
      studentId: student.studentId,
      expiresAt,
    });
    await this.mailService.sendCode(student.email, verificationCode);
  };

  verifyCode = async (studentId: string, code: string, now: Date): Promise<VerifyCodeResult> => {
    // 無い・期限切れ・使用済み(A8-8)・違う、はどれも同じに断る。5回間違えたらコードを消し、申請し直させる(R-8)
    const record = await this.authRepository.checkTmpCode(studentId);
    const attempt = afterCodeAttempt(record, record !== null && sameHash(record.codeHash, hashToken(code)), now);
    if (!attempt.ok) {
      if (attempt.action === "count")
        await this.authRepository.saveCodeAttempts({ studentId, attempts: attempt.attempts });
      if (attempt.action === "invalidate") await this.authRepository.deleteTmpCode(studentId);
      throw new DomainError("INVALID_CODE");
    }

    // 登録用トークンはDBにハッシュだけを置き、登録で1回使ったら行ごと消す(JWTと違い、1回だけにできる。A8-8)
    const token = this.secrets.newToken();
    // 画面が「あと何分で手続きが切れるか」を出せるように、期限も返す(docs/api.md 4.1)
    const expiresAt = new Date(now.getTime() + REGISTRATION_TOKEN_MINUTES * 60 * 1000);
    await this.authRepository.saveRegistrationToken({ studentId, tokenHash: hashToken(token), expiresAt });
    return { token, expiresAt };
  };

  signUp = async (plainPassword: string, registerToken: string, now: Date): Promise<AuthResult> => {
    // でたらめ・使用済み(行ごと消してある)・期限切れは、どれも同じに断る
    const record = await this.authRepository.findByRegistrationTokenHash(hashToken(registerToken));
    if (!record || !record.tokenExpiresAt || now >= record.tokenExpiresAt) throw new DomainError("INVALID_TOKEN");
    const { studentId } = record;

    const existsUser = await this.users.findByStudentId(studentId);
    if (existsUser) throw new DomainError("ALREADY_REGISTERED");

    const entry = await this.roster.findByStudentId(studentId);
    if (!entry) throw new DomainError("INVALID_TOKEN");

    const passwordHash = await this.passwords.hash(plainPassword);
    const user = await this.users.create({ studentId, passwordHash });
    await this.authRepository.deleteTmpCode(studentId);

    return this.createSession(user, entry, now);
  };

  login = async (studentId: string, plainPassword: string, now: Date): Promise<AuthResult> => {
    const { user, entry } = await this.verifyCredentials(studentId, plainPassword, now);
    return this.createSession(user, entry, now);
  };

  // 学籍番号とパスワードで本人を確かめる。ログインと、タブレットの端末の登録(管理者がその場で確かめる。D2)が使う。
  // 学籍番号が無い・パスワード違い・無効な人・名簿から消えた、のどれかは言わない(R-16・R-A14)。
  // 続けて5回間違えたら15分止める(F1。端末の登録も同じパスワードを試せるので、同じ回数で数える)
  verifyCredentials = async (
    studentId: string,
    plainPassword: string,
    now: Date,
  ): Promise<{ user: UserRecord; entry: RosterEntry }> => {
    const user = await this.users.findByStudentId(studentId);
    if (!user) throw new DomainError("INVALID_CREDENTIALS");
    if (isLoginLocked(user.loginLockedUntil, now)) throw new DomainError("RATE_LIMITED");

    const attempt = afterLoginAttempt(
      user.loginFailedAttempts,
      await this.passwords.matches(plainPassword, user.passwordHash),
      now,
    );
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
  };

  // Cookieを消すだけでは、盗まれた番号が期限(7日)まで使えるので、DBからも消す(R-15)。無ければ何もしない
  logout = async (sessionToken: string | undefined): Promise<void> => {
    if (!sessionToken) return;
    await this.sessions.deleteByTokenHash(hashToken(sessionToken));
  };

  // 番号そのものはCookieにだけ入れ、DBにはハッシュだけを置く。ログインのたびに別のセッションを作る(ほかの端末のログインは切らない。Q9)
  private async createSession(user: UserRecord, profile: RosterEntry, now: Date): Promise<AuthResult> {
    const sessionToken = this.secrets.newToken();
    await this.sessions.create({
      tokenHash: hashToken(sessionToken),
      userId: user.id,
      kind: "WEB",
      expiresAt: new Date(now.getTime() + WEB_SESSION_DAYS * 24 * 60 * 60 * 1000),
    });

    return {
      sessionToken,
      // 学年・専攻・カードの番号は入れない(画面は /api/me で取る。docs/api.md 5章 SessionUser)
      user: {
        id: user.id,
        name: profile.name,
        studentId: user.studentId,
        userType: profile.userType,
        role: user.role,
      },
    };
  }
}
