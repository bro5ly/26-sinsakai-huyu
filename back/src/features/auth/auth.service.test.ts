import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import * as jwtLib from "@/lib/jwt.js";
import { AuthService, type AuthStore, type Mailer, type UserStore } from "./auth.service.js";

// 名前に「現状:」が付いたテストは、仕様では変えると決まっている今の動きを守るもの(動きを変えない整理の間だけ)。
// docs/backlog.md 0.8 で仕様に合わせて書き直す。付いていないものは仕様(docs/spec.md の番号)のテスト
let passwordHash = "";
beforeAll(async () => {
    passwordHash = await bcrypt.hash("password123", 4);
});

const registered = () => ({ id: "user-1", studentId: "20240001", passwordHash, role: "MEMBER" as const });
const yamada = rosterEntry({ studentId: "20240001", name: "山田 太郎", email: "yamada@example.com", serialNumber: "IC-CARD-001", grade: "2年", major: "情報工学科" });
const unregistered = rosterEntry({ studentId: "20260001", name: "テスト 太郎", email: "taro@example.com", serialNumber: "SN-001" });

const users = (overrides: Partial<UserStore> = {}): UserStore => ({
    create: notUsed,
    findById: async (id) => (id === "user-1" ? registered() : null),
    findByStudentId: async (studentId) => (studentId === "20240001" ? registered() : null),
    ...overrides,
});

const auth = (overrides: Partial<AuthStore> = {}): AuthStore => ({
    saveRefreshToken: async () => undefined as never,
    findRefreshToken: notUsed,
    saveTmpCode: notUsed,
    checkTmpCode: notUsed,
    deleteTmpCode: notUsed,
    ...overrides,
});

const mailer = (sent: { to: string; code: string }[] = []): Mailer => ({
    sendCode: async (to, code) => {
        sent.push({ to, code });
        return undefined as never;
    },
});

const sessionUser = {
    id: "user-1",
    name: "山田 太郎",
    userType: "STUDENT",
    grade: "2年",
    major: "情報工学科",
    studentId: "20240001",
    serialNumber: "IC-CARD-001",
};

describe("requestVerification(登録の認証コードを送る)", () => {
    describe("正常系", () => {
        it("A3 名簿にいて未登録なら、6桁のコードを保存し、名簿のメールアドレスに送る(R-4)", async () => {
            const saved: { verificationCode: string; studentId: string }[] = [];
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(
                users(),
                auth({ saveTmpCode: async (data) => (saved.push(data), undefined as never) }),
                mailer(sent),
                new FakeRoster([yamada, unregistered]),
            );

            const result = await service.requestVerification("20260001");

            expect(result).toEqual({ message: "CODE_SENT" });
            expect(saved[0]?.studentId).toBe("20260001");
            expect(saved[0]?.verificationCode).toMatch(/^\d{6}$/);
            expect(sent).toEqual([{ to: "taro@example.com", code: saved[0]?.verificationCode }]);
        });
    });

    describe("異常系", () => {
        it("A1 名簿に無い学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(users(), auth({ saveTmpCode: notUsed }), mailer(sent), new FakeRoster([yamada]));

            expect(await service.requestVerification("99999999")).toEqual({ message: "CODE_SENT" });
            expect(sent).toEqual([]);
        });

        it("A2 登録済みの学籍番号でも、成功と同じ応答を返し、コードの保存もメールもしない(R-16・auth.md 4.6)", async () => {
            const sent: { to: string; code: string }[] = [];
            const service = new AuthService(users(), auth({ saveTmpCode: notUsed }), mailer(sent), new FakeRoster([yamada]));

            expect(await service.requestVerification("20240001")).toEqual({ message: "CODE_SENT" });
            expect(sent).toEqual([]);
        });
    });
});

describe("verifyCode(認証コードを確かめる)", () => {
    const record = (overrides: Partial<{ code: string; expiresAt: Date }> = {}) => ({
        studentId: "20260001",
        code: "123456",
        expiresAt: new Date(Date.now() + 10 * 60_000),
        createdAt: new Date(),
        ...overrides,
    });

    describe("正常系", () => {
        it("V1 コードが合い期限内なら、コードを消し、その学籍番号の登録用トークンを返す(R-6)", async () => {
            const deleted: string[] = [];
            const service = new AuthService(
                users(),
                auth({ checkTmpCode: async () => record(), deleteTmpCode: async (id) => (deleted.push(id), undefined as never) }),
                mailer(),
                new FakeRoster([unregistered]),
            );

            const result = await service.verifyCode("20260001", "123456");

            expect(deleted).toEqual(["20260001"]);
            expect(jwtLib.verifyRegistrationToken(result.registrationToken)).toMatchObject({ studentId: "20260001" });
        });
    });

    describe("異常系", () => {
        it("V2 コードが違えば、断り、コードは消さない(R-7)", async () => {
            const deleted: string[] = [];
            const service = new AuthService(
                users(),
                auth({ checkTmpCode: async () => record(), deleteTmpCode: async (id) => (deleted.push(id), undefined as never) }),
                mailer(),
                new FakeRoster([unregistered]),
            );

            await expect(service.verifyCode("20260001", "654321")).rejects.toMatchObject({ code: "INVALID_CODE" });
            expect(deleted).toEqual([]);
        });

        it("V3 期限切れなら、断る(INVALID_CODE。R-7)", async () => {
            const service = new AuthService(users(), auth({ checkTmpCode: async () => record({ expiresAt: new Date(Date.now() - 60_000) }) }), mailer(), new FakeRoster([]));

            await expect(service.verifyCode("20260001", "123456")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });

        it("V4 コードを申請していなければ、断る(INVALID_CODE。R-7)", async () => {
            const service = new AuthService(users(), auth({ checkTmpCode: async () => null }), mailer(), new FakeRoster([]));

            await expect(service.verifyCode("20260001", "123456")).rejects.toMatchObject({ code: "INVALID_CODE" });
        });
    });
});

describe("signUp(パスワードを決めて登録する)", () => {
    describe("正常系", () => {
        it("A4 名簿にいれば、学籍番号とパスワードのハッシュだけで利用者を作り、名簿の名前で返す(R-9・R-10)", async () => {
            const created: { studentId: string; passwordHash: string }[] = [];
            const service = new AuthService(
                users({
                    findByStudentId: async () => null,
                    create: async (data) => (created.push(data), { id: "user-9", studentId: data.studentId, passwordHash: data.passwordHash, role: "MEMBER" as const }),
                }),
                auth(),
                mailer(),
                new FakeRoster([unregistered]),
            );

            const result = await service.signUp("password123", jwtLib.signRegistrationToken({ studentId: "20260001" }));

            expect(created).toHaveLength(1);
            expect(created[0]?.studentId).toBe("20260001");
            expect(await bcrypt.compare("password123", created[0]?.passwordHash ?? "")).toBe(true);
            expect(result.user).toMatchObject({ id: "user-9", name: "テスト 太郎", studentId: "20260001", serialNumber: "SN-001" });
        });
    });

    describe("異常系", () => {
        it("A5 名簿に無ければ、作らずに断る(INVALID_TOKEN)", async () => {
            const service = new AuthService(users({ findByStudentId: async () => null }), auth(), mailer(), new FakeRoster([]));

            await expect(service.signUp("password123", jwtLib.signRegistrationToken({ studentId: "20260001" }))).rejects.toMatchObject({
                code: "INVALID_TOKEN",
            });
        });

        it("A10 登録用トークンが壊れていれば、断る(INVALID_TOKEN。docs/api.md 3.2。500にしない)", async () => {
            const service = new AuthService(users({ findByStudentId: async () => null }), auth(), mailer(), new FakeRoster([unregistered]));

            await expect(service.signUp("password123", "broken-token")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        });

        it("A12 登録用トークンの学籍番号がすでに登録済みなら、断る(ALREADY_REGISTERED)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

            await expect(service.signUp("password123", jwtLib.signRegistrationToken({ studentId: "20240001" }))).rejects.toMatchObject({ code: "ALREADY_REGISTERED" });
        });
    });
});

describe("login(学籍番号とパスワードでログインする)", () => {
    describe("正常系", () => {
        it("A6 パスワードが合えば、名簿の名前で返し、リフレッシュトークンを保存する(R-11)", async () => {
            const savedFor: string[] = [];
            const service = new AuthService(
                users(),
                auth({ saveRefreshToken: async (data) => (savedFor.push(data.userId), undefined as never) }),
                mailer(),
                new FakeRoster([yamada]),
            );

            const result = await service.login("20240001", "password123");

            expect(result.user).toEqual(sessionUser);
            expect(savedFor).toEqual(["user-1"]);
        });
    });

    describe("異常系", () => {
        it("A7 パスワードが違えば、断る(INVALID_CREDENTIALS。R-16)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

            await expect(service.login("20240001", "wrongpass1")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("A11 学籍番号が登録されていなければ、パスワード違いと同じく断る(INVALID_CREDENTIALS。R-16)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

            await expect(service.login("11111111", "password123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("A8 名簿から消えていれば、パスワードが合っても、理由を言わずに断る(INVALID_CREDENTIALS。Q13・R-A14)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([]));

            await expect(service.login("20240001", "password123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });
    });
});

describe("refreshSession(リフレッシュトークンでセッションを続ける)", () => {
    // 発行から1分たったトークン(同じ秒に発行すると、新しいトークンが古いものと同じ文字列になるため)
    const oldToken = () =>
        jwt.sign({ sub: "user-1", iat: Math.floor(Date.now() / 1000) - 60 }, process.env["JWT_REFRESH_SECRET"] ?? "", { expiresIn: "7d" });
    const saved = (token: string, expiresAt = new Date(Date.now() + 60_000)) => ({ id: "rt-1", token, userId: "user-1", expiresAt, createdAt: new Date() });

    describe("正常系", () => {
        it("F1 DBにある有効なトークンなら、新しいアクセストークンとリフレッシュトークンを出し、DBのトークンを入れ替える(R-13・R-14)", async () => {
            const token = oldToken();
            const savedTokens: string[] = [];
            const service = new AuthService(
                users(),
                auth({ findRefreshToken: async () => saved(token), saveRefreshToken: async (data) => (savedTokens.push(data.refreshToken), undefined as never) }),
                mailer(),
                new FakeRoster([yamada]),
            );

            const result = await service.refreshSession(token);

            expect(result.user).toEqual(sessionUser);
            expect(result.refreshToken).not.toBe(token);
            expect(savedTokens).toEqual([result.refreshToken]);
        });
    });

    describe("異常系", () => {
        it("F2 DBに無いトークン(ログアウト済み・入れ替え済み)なら、断る(INVALID_SESSION。R-14)", async () => {
            const service = new AuthService(users(), auth({ findRefreshToken: async () => null }), mailer(), new FakeRoster([yamada]));

            await expect(service.refreshSession(oldToken())).rejects.toMatchObject({ code: "INVALID_SESSION" });
        });

        it("F3 DBの期限が切れていれば、断る(INVALID_SESSION)", async () => {
            const token = oldToken();
            const service = new AuthService(users(), auth({ findRefreshToken: async () => saved(token, new Date(Date.now() - 1000)) }), mailer(), new FakeRoster([yamada]));

            await expect(service.refreshSession(token)).rejects.toMatchObject({ code: "INVALID_SESSION" });
        });

        it("F4 トークンが壊れていれば、断る(INVALID_SESSION。docs/api.md 3.2。500にしない)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

            await expect(service.refreshSession("broken-token")).rejects.toMatchObject({ code: "INVALID_SESSION" });
        });

        it("F5 トークンが無ければ(Cookieが無い)、断る(INVALID_SESSION。500にしない)", async () => {
            const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

            await expect(service.refreshSession(undefined as unknown as string)).rejects.toMatchObject({ code: "INVALID_SESSION" });
        });

        it("A9 名簿から消えていれば、断る(INVALID_SESSION。Q13)", async () => {
            const token = jwtLib.signRefreshToken({ sub: "user-1" });
            const service = new AuthService(
                users(),
                auth({ findRefreshToken: async () => ({ id: "rt-1", token, userId: "user-1", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() }) }),
                mailer(),
                new FakeRoster([]),
            );

            await expect(service.refreshSession(token)).rejects.toMatchObject({ code: "INVALID_SESSION" });
        });
    });
});
