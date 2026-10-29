import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { cryptoSecrets, hashToken } from "@/lib/session-token.js";
import { bcryptPasswords } from "@/lib/password.js";
import { AuthService } from "./auth.service.js";
import type { Mailer } from "@/lib/mail.js";
import type {
  LoginAttempt,
  NewSession,
  SessionStore,
  UserRecord,
  UserStore,
  VerificationCodeRecord,
  VerificationCodeStore,
} from "./auth.types.js";

let passwordHash = "";
beforeAll(async () => {
  passwordHash = await bcrypt.hash("password123", 4);
});

const minute = 60_000;
const day = 86_400_000;

const registered = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: "user-1",
  studentId: "20240001",
  passwordHash,
  role: "MEMBER" as const,
  isActive: true,
  loginFailedAttempts: 0,
  loginLockedUntil: null,
  ...overrides,
});
const yamada = rosterEntry({
  studentId: "20240001",
  name: "山田 太郎",
  email: "yamada@example.com",
  serialNumber: "IC-CARD-001",
  grade: "2年",
  major: "情報工学科",
});
const unregistered = rosterEntry({
  studentId: "20260001",
  name: "テスト 太郎",
  email: "taro@example.com",
  serialNumber: "SN-001",
});

const users = (overrides: Partial<UserStore> = {}): UserStore => ({
  createUser: notUsed,
  findUserById: async (id) => (id === "user-1" ? registered() : null),
  findUserByStudentId: async (studentId) => (studentId === "20240001" ? registered() : null),
  saveLoginAttempt: notUsed,
  ...overrides,
});

const codes = (overrides: Partial<VerificationCodeStore> = {}): VerificationCodeStore => ({
  saveCode: notUsed,
  saveCodeAttempts: notUsed,
  findCodeByStudentId: notUsed,
  deleteCodeByStudentId: notUsed,
  saveRegistrationToken: notUsed,
  findRegistrationTokenByHash: notUsed,
  ...overrides,
});

type CreatedSession = NewSession;
const sessions = (overrides: Partial<SessionStore> = {}, created: CreatedSession[] = []): SessionStore => ({
  createSession: async (data) => {
    created.push(data);
  },
  findSessionByTokenHash: notUsed,
  saveSessionLastUsedAt: notUsed,
  deleteSessionByTokenHash: notUsed,
  ...overrides,
});

const mailer = (sent: { to: string; code: string }[] = []): Mailer => ({
  sendCode: async ({ to, code }) => {
    sent.push({ to, code });
    return undefined as never;
  },
});

// 本物の乱数とbcryptを使う(このファイルは、それらを渡す形に変える前の動きを確かめているため)
const authService = (
  users: UserStore,
  verificationCodes: VerificationCodeStore,
  sessions: SessionStore,
  mailer: Mailer,
  roster: FakeRoster,
) =>
  new AuthService({
    users,
    verificationCodes,
    sessions,
    mailer,
    roster,
    passwords: bcryptPasswords,
    secrets: cryptoSecrets,
  });

// ログインの応答の利用者。学年・専攻・カードの番号は入れない(/api/me で取る。docs/api.md 5章 SessionUser)
const sessionUser = {
  id: "user-1",
  name: "山田 太郎",
  studentId: "20240001",
  userType: "STUDENT",
  role: "MEMBER",
};

describe("requestVerification(登録の認証コードを送る)", () => {
  describe("正常系", () => {
    it("A3 名簿にいて未登録なら、6桁のコードを保存し、名簿のメールアドレスに送る(R-4)", async () => {
      const saved: { codeHash: string; studentId: string }[] = [];
      const sent: { to: string; code: string }[] = [];
      const service = authService(
        users(),
        codes({ saveCode: async (data) => (saved.push(data), undefined as never) }),
        sessions(),
        mailer(sent),
        new FakeRoster([yamada, unregistered]),
      );

      const result = await service.requestVerification("20260001", new Date());

      expect(result).toBeUndefined();
      expect(saved[0]?.studentId).toBe("20260001");
      expect(sent).toHaveLength(1);
      expect(sent[0]?.to).toBe("taro@example.com");
      expect(sent[0]?.code).toMatch(/^\d{6}$/);
      // DBにはコードそのものではなく、ハッシュだけを置く(docs/auth.md 4.6)
      expect(saved[0]?.codeHash).toBe(hashToken(sent[0]?.code ?? ""));
    });
  });

  describe("異常系", () => {
    it("A1 名簿に無い学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
      const sent: { to: string; code: string }[] = [];
      const service = authService(users(), codes(), sessions(), mailer(sent), new FakeRoster([yamada]));

      expect(await service.requestVerification("99999999", new Date())).toBeUndefined();
      expect(sent).toEqual([]);
    });

    it("A2 登録済みの学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
      const sent: { to: string; code: string }[] = [];
      const service = authService(users(), codes(), sessions(), mailer(sent), new FakeRoster([yamada]));

      expect(await service.requestVerification("20240001", new Date())).toBeUndefined();
      expect(sent).toEqual([]);
    });
  });
});

describe("verifyCode(認証コードを確かめる)", () => {
  const record = (overrides: Partial<VerificationCodeRecord> = {}): VerificationCodeRecord => ({
    studentId: "20260001",
    codeHash: hashToken("123456"),
    expiresAt: new Date(Date.now() + 10 * minute),
    tokenHash: null,
    attempts: 0,
    ...overrides,
  });

  describe("正常系", () => {
    it("V1 コードが合い期限内なら、登録用トークンを作ってハッシュだけを保存し、トークンとその期限(15分後)を返す(R-6・A8-8)", async () => {
      const saved: { studentId: string; tokenHash: string; expiresAt: Date }[] = [];
      const service = authService(
        users(),
        codes({
          findCodeByStudentId: async () => record(),
          saveRegistrationToken: async (data) => void saved.push(data),
        }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      const before = Date.now();
      const result = await service.verifyCode({ studentId: "20260001", code: "123456" }, new Date());

      expect(saved).toEqual([
        { studentId: "20260001", tokenHash: hashToken(result.token), expiresAt: result.expiresAt },
      ]);
      expect(result.expiresAt.getTime() - before).toBeGreaterThanOrEqual(15 * minute - 1000);
      expect(result.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * minute);
    });
  });

  describe("異常系", () => {
    it("V2 コードが違えば、断り、トークンは作らず、間違えた回数を1つ足す(R-7・R-8)", async () => {
      const counted: { studentId: string; attempts: number }[] = [];
      const service = authService(
        users(),
        codes({ findCodeByStudentId: async () => record(), saveCodeAttempts: async (data) => void counted.push(data) }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      await expect(service.verifyCode({ studentId: "20260001", code: "654321" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CODE",
      });
      expect(counted).toEqual([{ studentId: "20260001", attempts: 1 }]);
    });

    it("V6 5回目の間違いで、コードを消す(申請し直させる。R-8・Q1)。応答は同じ INVALID_CODE", async () => {
      const deleted: string[] = [];
      const service = authService(
        users(),
        codes({
          findCodeByStudentId: async () => record({ attempts: 4 }),
          deleteCodeByStudentId: async (id) => void deleted.push(id),
        }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      await expect(service.verifyCode({ studentId: "20260001", code: "654321" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CODE",
      });
      expect(deleted).toEqual(["20260001"]);
    });

    it("V3 期限切れなら、断る(INVALID_CODE。R-7)", async () => {
      const service = authService(
        users(),
        codes({ findCodeByStudentId: async () => record({ expiresAt: new Date(Date.now() - minute) }) }),
        sessions(),
        mailer(),
        new FakeRoster([]),
      );

      await expect(service.verifyCode({ studentId: "20260001", code: "123456" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CODE",
      });
    });

    it("V4 コードを申請していなければ、断る(INVALID_CODE。R-7)", async () => {
      const service = authService(
        users(),
        codes({ findCodeByStudentId: async () => null }),
        sessions(),
        mailer(),
        new FakeRoster([]),
      );

      await expect(service.verifyCode({ studentId: "20260001", code: "123456" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CODE",
      });
    });

    it("V5 そのコードでもうトークンを出していれば、断る(コードは1回だけ使える。INVALID_CODE。A8-8)", async () => {
      const service = authService(
        users(),
        codes({ findCodeByStudentId: async () => record({ tokenHash: "used" }) }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      await expect(service.verifyCode({ studentId: "20260001", code: "123456" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CODE",
      });
    });
  });
});

describe("signUp(パスワードを決めて登録する)", () => {
  const tokenRecord = (overrides: Partial<{ studentId: string; tokenExpiresAt: Date }> = {}) => ({
    studentId: "20260001",
    tokenExpiresAt: new Date(Date.now() + 10 * minute),
    ...overrides,
  });
  const newUser = async (data: { studentId: string; passwordHash: string }): Promise<UserRecord> => ({
    id: "user-9",
    studentId: data.studentId,
    passwordHash: data.passwordHash,
    role: "MEMBER" as const,
    isActive: true,
    loginFailedAttempts: 0,
    loginLockedUntil: null,
  });

  describe("正常系", () => {
    it("A4 登録用トークンがDBにあれば、学籍番号とパスワードのハッシュだけで利用者を作り、名簿の名前で返す(R-9・R-10)", async () => {
      const created: { studentId: string; passwordHash: string }[] = [];
      const service = authService(
        users({
          findUserByStudentId: async () => null,
          createUser: async (data) => (created.push(data), newUser(data)),
        }),
        codes({
          findRegistrationTokenByHash: async (hash) => (hash === hashToken("token-1") ? tokenRecord() : null),
          deleteCodeByStudentId: async () => undefined as never,
        }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      const result = await service.signUp({ token: "token-1", password: "password123" }, new Date());

      expect(created).toHaveLength(1);
      expect(created[0]?.studentId).toBe("20260001");
      expect(await bcrypt.compare("password123", created[0]?.passwordHash ?? "")).toBe(true);
      expect(result.user).toEqual({
        id: "user-9",
        name: "テスト 太郎",
        studentId: "20260001",
        userType: "STUDENT",
        role: "MEMBER",
      });
    });

    it("A15 登録したら、登録用トークンを消し(1回だけ使える。A8-8)、Webのセッションを作る", async () => {
      const deleted: string[] = [];
      const created: CreatedSession[] = [];
      const service = authService(
        users({ findUserByStudentId: async () => null, createUser: newUser }),
        codes({
          findRegistrationTokenByHash: async () => tokenRecord(),
          deleteCodeByStudentId: async (id) => (deleted.push(id), undefined as never),
        }),
        sessions({}, created),
        mailer(),
        new FakeRoster([unregistered]),
      );

      const result = await service.signUp({ token: "token-1", password: "password123" }, new Date());

      expect(deleted).toEqual(["20260001"]);
      expect(created).toEqual([
        expect.objectContaining({ tokenHash: hashToken(result.sessionToken), userId: "user-9", kind: "WEB" }),
      ]);
    });
  });

  describe("異常系", () => {
    it("A5 名簿に無ければ、作らずに断る(INVALID_TOKEN)", async () => {
      const service = authService(
        users({ findUserByStudentId: async () => null }),
        codes({ findRegistrationTokenByHash: async () => tokenRecord() }),
        sessions(),
        mailer(),
        new FakeRoster([]),
      );

      await expect(service.signUp({ token: "token-1", password: "password123" }, new Date())).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });

    it("A10 登録用トークンがDBに無ければ(でたらめ・使用済み)、断る(INVALID_TOKEN。A8-8)", async () => {
      const service = authService(
        users({ findUserByStudentId: async () => null }),
        codes({ findRegistrationTokenByHash: async () => null }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      await expect(
        service.signUp({ token: "broken-token", password: "password123" }, new Date()),
      ).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });

    it("A13 登録用トークンの期限が切れていれば、断る(INVALID_TOKEN)", async () => {
      const service = authService(
        users({ findUserByStudentId: async () => null }),
        codes({ findRegistrationTokenByHash: async () => tokenRecord({ tokenExpiresAt: new Date(Date.now() - 1) }) }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

      await expect(service.signUp({ token: "token-1", password: "password123" }, new Date())).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });

    it("A12 登録用トークンの学籍番号がすでに登録済みなら、断る(ALREADY_REGISTERED)", async () => {
      const service = authService(
        users(),
        codes({ findRegistrationTokenByHash: async () => tokenRecord({ studentId: "20240001" }) }),
        sessions(),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.signUp({ token: "token-1", password: "password123" }, new Date())).rejects.toMatchObject({
        code: "ALREADY_REGISTERED",
      });
    });
  });

  describe("境界値", () => {
    const now = new Date("2026-10-29T10:00:00Z");
    const serviceWithTokenUntil = (tokenExpiresAt: Date) =>
      authService(
        users({ findUserByStudentId: async () => null, createUser: newUser }),
        codes({
          findRegistrationTokenByHash: async () => tokenRecord({ tokenExpiresAt }),
          deleteCodeByStudentId: async () => undefined,
        }),
        sessions(),
        mailer(),
        new FakeRoster([unregistered]),
      );

    it("A22 登録用トークンの期限ちょうどは、切れている(INVALID_TOKEN。R-6)", async () => {
      await expect(
        serviceWithTokenUntil(now).signUp({ token: "token-1", password: "password123" }, now),
      ).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });

    it("A23 期限の1ミリ秒前なら、まだ登録できる(R-6)", async () => {
      await expect(
        serviceWithTokenUntil(new Date(now.getTime() + 1)).signUp({ token: "token-1", password: "password123" }, now),
      ).resolves.toMatchObject({ user: { studentId: "20260001" } });
    });
  });
});

describe("login(学籍番号とパスワードでログインする)", () => {
  describe("正常系", () => {
    it("A6 パスワードが合えば、名簿の名前で返し、7日で切れるWebのセッションを作る。DBには番号のハッシュだけを置く(R-11・A8-3・A8-6)", async () => {
      const created: CreatedSession[] = [];
      const service = authService(users(), codes(), sessions({}, created), mailer(), new FakeRoster([yamada]));

      const before = Date.now();
      const result = await service.login({ studentId: "20240001", password: "password123" }, new Date());

      expect(result.user).toEqual(sessionUser);
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ tokenHash: hashToken(result.sessionToken), userId: "user-1", kind: "WEB" });
      expect(created[0]?.tokenHash).not.toBe(result.sessionToken);
      expect(created[0]?.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * day);
      expect(created[0]?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * day);
    });

    it("A16 ログインするたびに別のセッションを作る(ほかの端末のログインは切らない。Q9)", async () => {
      const created: CreatedSession[] = [];
      const service = authService(users(), codes(), sessions({}, created), mailer(), new FakeRoster([yamada]));

      const first = await service.login({ studentId: "20240001", password: "password123" }, new Date());
      const second = await service.login({ studentId: "20240001", password: "password123" }, new Date());

      expect(first.sessionToken).not.toBe(second.sessionToken);
      expect(created).toHaveLength(2);
    });
  });

  describe("異常系", () => {
    it("A7 パスワードが違えば、断り(INVALID_CREDENTIALS。R-16)、続けて間違えた回数を1つ足す(F1)", async () => {
      const attempts: LoginAttempt[] = [];
      const service = authService(
        users({ saveLoginAttempt: async (data) => void attempts.push(data) }),
        codes(),
        sessions({ createSession: notUsed }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.login({ studentId: "20240001", password: "wrongpass1" }, new Date())).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
      expect(attempts).toEqual([{ userId: "user-1", failedAttempts: 1, lockedUntil: null }]);
    });

    it("A17 止めている間は、正しいパスワードでも、比べずに429 RATE_LIMITEDで断る(F1)", async () => {
      const now = new Date("2026-10-29T10:00:00Z");
      const service = authService(
        users({ findUserByStudentId: async () => registered({ loginLockedUntil: new Date(now.getTime() + minute) }) }),
        codes(),
        sessions({ createSession: notUsed }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.login({ studentId: "20240001", password: "password123" }, now)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
    });

    it("A11 学籍番号が登録されていなければ、パスワード違いと同じく断る(INVALID_CREDENTIALS。R-16)", async () => {
      const service = authService(
        users(),
        codes(),
        sessions({ createSession: notUsed }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.login({ studentId: "11111111", password: "password123" }, new Date())).rejects.toMatchObject(
        {
          code: "INVALID_CREDENTIALS",
        },
      );
    });

    it("A8 名簿から消えていれば、パスワードが合っても、理由を言わずに断る(INVALID_CREDENTIALS。Q13・R-A14)", async () => {
      const service = authService(users(), codes(), sessions({ createSession: notUsed }), mailer(), new FakeRoster([]));

      await expect(service.login({ studentId: "20240001", password: "password123" }, new Date())).rejects.toMatchObject(
        {
          code: "INVALID_CREDENTIALS",
        },
      );
    });

    it("A14 無効な人(is_active = false)は、パスワードが合っても、理由を言わずに断る(INVALID_CREDENTIALS。R-A14)", async () => {
      const service = authService(
        users({ findUserByStudentId: async () => registered({ isActive: false }) }),
        codes(),
        sessions({ createSession: notUsed }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.login({ studentId: "20240001", password: "password123" }, new Date())).rejects.toMatchObject(
        {
          code: "INVALID_CREDENTIALS",
        },
      );
    });
  });
});

describe("login の回数(学籍番号ごとに、続けて5回で15分止める。F1)", () => {
  const now = new Date("2026-10-29T10:00:00Z");
  const recordAttempts = (user: UserRecord) => {
    const attempts: LoginAttempt[] = [];
    const service = authService(
      users({ findUserByStudentId: async () => user, saveLoginAttempt: async (data) => void attempts.push(data) }),
      codes(),
      sessions(),
      mailer(),
      new FakeRoster([yamada]),
    );
    return { service, attempts };
  };

  describe("正常系", () => {
    it("A19 間違えたあとに合えば、通して回数を0に戻す(「続けて」の5回)", async () => {
      const { service, attempts } = recordAttempts(registered({ loginFailedAttempts: 3 }));

      await expect(service.login({ studentId: "20240001", password: "password123" }, now)).resolves.toMatchObject({
        user: sessionUser,
      });
      expect(attempts).toEqual([{ userId: "user-1", failedAttempts: 0, lockedUntil: null }]);
    });

    it("A20 一度も間違えていなければ、合ったときにDBに書かない", async () => {
      const { service, attempts } = recordAttempts(registered());

      await service.login({ studentId: "20240001", password: "password123" }, now);
      expect(attempts).toEqual([]);
    });
  });

  describe("境界値", () => {
    it("A18 5回目の間違いで15分止め、その応答から429 RATE_LIMITED にする", async () => {
      const { service, attempts } = recordAttempts(registered({ loginFailedAttempts: 4 }));

      await expect(service.login({ studentId: "20240001", password: "wrongpass1" }, now)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
      expect(attempts).toEqual([
        { userId: "user-1", failedAttempts: 0, lockedUntil: new Date(now.getTime() + 15 * minute) },
      ]);
    });

    it("A21 止める期限を過ぎていれば、また試せる。合えば通し、止めた記録を消す(F3)", async () => {
      const { service, attempts } = recordAttempts(registered({ loginLockedUntil: now }));

      await expect(service.login({ studentId: "20240001", password: "password123" }, now)).resolves.toMatchObject({
        user: sessionUser,
      });
      expect(attempts).toEqual([{ userId: "user-1", failedAttempts: 0, lockedUntil: null }]);
    });
  });
});

describe("logout(ログアウトする)", () => {
  describe("正常系", () => {
    it("L1 Cookieのセッションの番号から、DBのセッションを消す(R-15・A8-3)", async () => {
      const deleted: string[] = [];
      const service = authService(
        users(),
        codes(),
        sessions({ deleteSessionByTokenHash: async (hash) => void deleted.push(hash) }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await service.logout("session-token-1");

      expect(deleted).toEqual([hashToken("session-token-1")]);
    });
  });

  describe("境界値", () => {
    it("L2 番号が無ければ(Cookieが無い・ログアウト済み)、DBに触らずに終える(何度ログアウトしてもよい)", async () => {
      const service = authService(
        users(),
        codes(),
        sessions({ deleteSessionByTokenHash: notUsed }),
        mailer(),
        new FakeRoster([yamada]),
      );

      await expect(service.logout(undefined)).resolves.toBeUndefined();
    });
  });
});
