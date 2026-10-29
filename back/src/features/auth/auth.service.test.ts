import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { hashToken } from "@/lib/session-token.js";
import { AuthService } from "./auth.service.js";
import type { CodeStore, Mailer, SessionStore, UserRecord, UserStore } from "./auth.types.js";

let passwordHash = "";
beforeAll(async () => {
    passwordHash = await bcrypt.hash("password123", 4);
});

const minute = 60_000;
const day = 86_400_000;

const registered = (overrides: Partial<{ isActive: boolean }> = {}) => ({ id: "user-1", studentId: "20240001", passwordHash, role: "MEMBER" as const, isActive: true, ...overrides });
const yamada = rosterEntry({ studentId: "20240001", name: "山田 太郎", email: "yamada@example.com", serialNumber: "IC-CARD-001", grade: "2年", major: "情報工学科" });
const unregistered = rosterEntry({ studentId: "20260001", name: "テスト 太郎", email: "taro@example.com", serialNumber: "SN-001" });

const users = (overrides: Partial<UserStore> = {}): UserStore => ({
    create: notUsed,
    findById: async (id) => (id === "user-1" ? registered() : null),
    findByStudentId: async (studentId) => (studentId === "20240001" ? registered() : null),
    ...overrides,
});

const codes = (overrides: Partial<CodeStore> = {}): CodeStore => ({
    saveTmpCode: notUsed,
    checkTmpCode: notUsed,
    deleteTmpCode: notUsed,
    saveRegistrationToken: notUsed,
    findByRegistrationTokenHash: notUsed,
    ...overrides,
});

type CreatedSession = Parameters<SessionStore["create"]>[0];
const sessions = (overrides: Partial<SessionStore> = {}, created: CreatedSession[] = []): SessionStore => ({
    create: async (data) => {
        created.push(data);
    },
    findByTokenHash: notUsed,
    deleteByTokenHash: notUsed,
    ...overrides,
});

const mailer = (sent: { to: string; code: string }[] = []): Mailer => ({
    sendCode: async (to, code) => {
        sent.push({ to, code });
        return undefined as never;
    },
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
            const saved: { code: string; studentId: string }[] = [];
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(
                users(),
                codes({ saveTmpCode: async (data) => (saved.push(data), undefined as never) }),
                sessions(),
                mailer(sent),
                new FakeRoster([yamada, unregistered]),
            );

            const result = await service.requestVerification("20260001");

            expect(result).toBeUndefined();
            expect(saved[0]?.studentId).toBe("20260001");
            expect(saved[0]?.code).toMatch(/^\d{6}$/);
            expect(sent).toEqual([{ to: "taro@example.com", code: saved[0]?.code }]);
        });
    });

    describe("異常系", () => {
        it("A1 名簿に無い学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(users(), codes(), sessions(), mailer(sent), new FakeRoster([yamada]));

            expect(await service.requestVerification("99999999")).toBeUndefined();
            expect(sent).toEqual([]);
        });

        it("A2 登録済みの学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(users(), codes(), sessions(), mailer(sent), new FakeRoster([yamada]));

            expect(await service.requestVerification("20240001")).toBeUndefined();
            expect(sent).toEqual([]);
        });
    });
});

describe("verifyCode(認証コードを確かめる)", () => {
    const record = (overrides: Partial<{ code: string; expiresAt: Date; tokenHash: string | null }> = {}) => ({
        studentId: "20260001",
        code: "123456",
        expiresAt: new Date(Date.now() + 10 * minute),
        createdAt: new Date(),
        tokenHash: null,
        tokenExpiresAt: null,
        ...overrides,
    });

    describe("正常系", () => {
        it("V1 コードが合い期限内なら、登録用トークンを作ってハッシュだけを保存し、トークンとその期限(15分後)を返す(R-6・A8-8)", async () => {
            const saved: { studentId: string; tokenHash: string; expiresAt: Date }[] = [];
            const service = new AuthService(
                users(),
                codes({ checkTmpCode: async () => record(), saveRegistrationToken: async (data) => void saved.push(data) }),
                sessions(),
                mailer(),
                new FakeRoster([unregistered]),
            );

            const before = Date.now();
            const result = await service.verifyCode("20260001", "123456");

            expect(saved).toEqual([{ studentId: "20260001", tokenHash: hashToken(result.token), expiresAt: result.expiresAt }]);
            expect(result.expiresAt.getTime() - before).toBeGreaterThanOrEqual(15 * minute - 1000);
            expect(result.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * minute);
        });
    });

    describe("異常系", () => {
        it("V2 コードが違えば、断り、トークンは作らない(R-7)", async () => {
            const service = new AuthService(users(), codes({ checkTmpCode: async () => record() }), sessions(), mailer(), new FakeRoster([unregistered]));

            await expect(service.verifyCode("20260001", "654321")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });

        it("V3 期限切れなら、断る(INVALID_CODE。R-7)", async () => {
            const service = new AuthService(users(), codes({ checkTmpCode: async () => record({ expiresAt: new Date(Date.now() - minute) }) }), sessions(), mailer(), new FakeRoster([]));

            await expect(service.verifyCode("20260001", "123456")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });

        it("V4 コードを申請していなければ、断る(INVALID_CODE。R-7)", async () => {
            const service = new AuthService(users(), codes({ checkTmpCode: async () => null }), sessions(), mailer(), new FakeRoster([]));

            await expect(service.verifyCode("20260001", "123456")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });

        it("V5 そのコードでもうトークンを出していれば、断る(コードは1回だけ使える。INVALID_CODE。A8-8)", async () => {
            const service = new AuthService(users(), codes({ checkTmpCode: async () => record({ tokenHash: "used" }) }), sessions(), mailer(), new FakeRoster([unregistered]));

            await expect(service.verifyCode("20260001", "123456")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });
    });
});

describe("signUp(パスワードを決めて登録する)", () => {
    const tokenRecord = (overrides: Partial<{ studentId: string; tokenExpiresAt: Date }> = {}) => ({
        studentId: "20260001",
        tokenExpiresAt: new Date(Date.now() + 10 * minute),
        ...overrides,
    });
    const newUser = async (data: { studentId: string; passwordHash: string }): Promise<UserRecord> => ({ id: "user-9", studentId: data.studentId, passwordHash: data.passwordHash, role: "MEMBER" as const, isActive: true });

    describe("正常系", () => {
        it("A4 登録用トークンがDBにあれば、学籍番号とパスワードのハッシュだけで利用者を作り、名簿の名前で返す(R-9・R-10)", async () => {
            const created: { studentId: string; passwordHash: string }[] = [];
            const service = new AuthService(
                users({ findByStudentId: async () => null, create: async (data) => (created.push(data), newUser(data)) }),
                codes({ findByRegistrationTokenHash: async (hash) => (hash === hashToken("token-1") ? tokenRecord() : null), deleteTmpCode: async () => undefined as never }),
                sessions(),
                mailer(),
                new FakeRoster([unregistered]),
            );

            const result = await service.signUp("password123", "token-1");

            expect(created).toHaveLength(1);
            expect(created[0]?.studentId).toBe("20260001");
            expect(await bcrypt.compare("password123", created[0]?.passwordHash ?? "")).toBe(true);
            expect(result.user).toEqual({ id: "user-9", name: "テスト 太郎", studentId: "20260001", userType: "STUDENT", role: "MEMBER" });
        });

        it("A15 登録したら、登録用トークンを消し(1回だけ使える。A8-8)、Webのセッションを作る", async () => {
            const deleted: string[] = [];
            const created: CreatedSession[] = [];
            const service = new AuthService(
                users({ findByStudentId: async () => null, create: newUser }),
                codes({ findByRegistrationTokenHash: async () => tokenRecord(), deleteTmpCode: async (id) => (deleted.push(id), undefined as never) }),
                sessions({}, created),
                mailer(),
                new FakeRoster([unregistered]),
            );

            const result = await service.signUp("password123", "token-1");

            expect(deleted).toEqual(["20260001"]);
            expect(created).toEqual([expect.objectContaining({ tokenHash: hashToken(result.sessionToken), userId: "user-9", kind: "WEB" })]);
        });
    });

    describe("異常系", () => {
        it("A5 名簿に無ければ、作らずに断る(INVALID_TOKEN)", async () => {
            const service = new AuthService(users({ findByStudentId: async () => null }), codes({ findByRegistrationTokenHash: async () => tokenRecord() }), sessions(), mailer(), new FakeRoster([]));

            await expect(service.signUp("password123", "token-1")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        });

        it("A10 登録用トークンがDBに無ければ(でたらめ・使用済み)、断る(INVALID_TOKEN。A8-8)", async () => {
            const service = new AuthService(users({ findByStudentId: async () => null }), codes({ findByRegistrationTokenHash: async () => null }), sessions(), mailer(), new FakeRoster([unregistered]));

            await expect(service.signUp("password123", "broken-token")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        });

        it("A13 登録用トークンの期限が切れていれば、断る(INVALID_TOKEN)", async () => {
            const service = new AuthService(
                users({ findByStudentId: async () => null }),
                codes({ findByRegistrationTokenHash: async () => tokenRecord({ tokenExpiresAt: new Date(Date.now() - 1) }) }),
                sessions(),
                mailer(),
                new FakeRoster([unregistered]),
            );

            await expect(service.signUp("password123", "token-1")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        });

        it("A12 登録用トークンの学籍番号がすでに登録済みなら、断る(ALREADY_REGISTERED)", async () => {
            const service = new AuthService(users(), codes({ findByRegistrationTokenHash: async () => tokenRecord({ studentId: "20240001" }) }), sessions(), mailer(), new FakeRoster([yamada]));

            await expect(service.signUp("password123", "token-1")).rejects.toMatchObject({ code: "ALREADY_REGISTERED" });
        });
    });
});

describe("login(学籍番号とパスワードでログインする)", () => {
    describe("正常系", () => {
        it("A6 パスワードが合えば、名簿の名前で返し、7日で切れるWebのセッションを作る。DBには番号のハッシュだけを置く(R-11・A8-3・A8-6)", async () => {
            const created: CreatedSession[] = [];
            const service = new AuthService(users(), codes(), sessions({}, created), mailer(), new FakeRoster([yamada]));

            const before = Date.now();
            const result = await service.login("20240001", "password123");

            expect(result.user).toEqual(sessionUser);
            expect(created).toHaveLength(1);
            expect(created[0]).toMatchObject({ tokenHash: hashToken(result.sessionToken), userId: "user-1", kind: "WEB" });
            expect(created[0]?.tokenHash).not.toBe(result.sessionToken);
            expect(created[0]?.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * day);
            expect(created[0]?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * day);
        });

        it("A16 ログインするたびに別のセッションを作る(ほかの端末のログインは切らない。Q9)", async () => {
            const created: CreatedSession[] = [];
            const service = new AuthService(users(), codes(), sessions({}, created), mailer(), new FakeRoster([yamada]));

            const first = await service.login("20240001", "password123");
            const second = await service.login("20240001", "password123");

            expect(first.sessionToken).not.toBe(second.sessionToken);
            expect(created).toHaveLength(2);
        });
    });

    describe("異常系", () => {
        it("A7 パスワードが違えば、断る(INVALID_CREDENTIALS。R-16)", async () => {
            const service = new AuthService(users(), codes(), sessions({ create: notUsed }), mailer(), new FakeRoster([yamada]));

            await expect(service.login("20240001", "wrongpass1")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("A11 学籍番号が登録されていなければ、パスワード違いと同じく断る(INVALID_CREDENTIALS。R-16)", async () => {
            const service = new AuthService(users(), codes(), sessions({ create: notUsed }), mailer(), new FakeRoster([yamada]));

            await expect(service.login("11111111", "password123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("A8 名簿から消えていれば、パスワードが合っても、理由を言わずに断る(INVALID_CREDENTIALS。Q13・R-A14)", async () => {
            const service = new AuthService(users(), codes(), sessions({ create: notUsed }), mailer(), new FakeRoster([]));

            await expect(service.login("20240001", "password123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("A14 無効な人(is_active = false)は、パスワードが合っても、理由を言わずに断る(INVALID_CREDENTIALS。R-A14)", async () => {
            const service = new AuthService(
                users({ findByStudentId: async () => registered({ isActive: false }) }),
                codes(),
                sessions({ create: notUsed }),
                mailer(),
                new FakeRoster([yamada]),
            );

            await expect(service.login("20240001", "password123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });
    });
});

describe("logout(ログアウトする)", () => {
    describe("正常系", () => {
        it("L1 Cookieのセッションの番号から、DBのセッションを消す(R-15・A8-3)", async () => {
            const deleted: string[] = [];
            const service = new AuthService(users(), codes(), sessions({ deleteByTokenHash: async (hash) => void deleted.push(hash) }), mailer(), new FakeRoster([yamada]));

            await service.logout("session-token-1");

            expect(deleted).toEqual([hashToken("session-token-1")]);
        });
    });

    describe("境界値", () => {
        it("L2 番号が無ければ(Cookieが無い・ログアウト済み)、DBに触らずに終える(何度ログアウトしてもよい)", async () => {
            const service = new AuthService(users(), codes(), sessions({ deleteByTokenHash: notUsed }), mailer(), new FakeRoster([yamada]));

            await expect(service.logout(undefined)).resolves.toBeUndefined();
        });
    });
});
