import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import * as jwtLib from "@/lib/jwt.js";
import { AuthService, type AuthStore, type Mailer, type UserStore } from "./auth.service.js";

// 今の応答の文言・コードをそのまま確かめる(変えるのは docs/backlog.md 0.8)
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
    it("A1 名簿に無い学籍番号なら、断る(404)", async () => {
        const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

        await expect(service.requestVerification("99999999")).rejects.toMatchObject({ statusCode: 404, code: "SUTUDENT_ID_NOT_FOUND" });
    });

    it("A2 登録済みの学籍番号なら、断る(409)", async () => {
        const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

        await expect(service.requestVerification("20240001")).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_EXISTS_USER" });
    });

    it("A3 名簿にいて未登録なら、6桁のコードを保存し、名簿のメールアドレスに送る", async () => {
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

describe("signUp(パスワードを決めて登録する)", () => {
    it("A4 名簿にいれば、学籍番号とパスワードのハッシュだけで利用者を作り、名簿の名前で返す", async () => {
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

    it("A5 名簿に無ければ、作らずに断る(400 CREATE_USER_FAILED)", async () => {
        const service = new AuthService(users({ findByStudentId: async () => null }), auth(), mailer(), new FakeRoster([]));

        await expect(service.signUp("password123", jwtLib.signRegistrationToken({ studentId: "20260001" }))).rejects.toMatchObject({
            statusCode: 400,
            code: "CREATE_USER_FAILED",
        });
    });
});

describe("login(学籍番号とパスワードでログインする)", () => {
    it("A6 パスワードが合えば、名簿の名前・カードの番号で返し、リフレッシュトークンを保存する", async () => {
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

    it("A7 パスワードが違えば、断る(400 INVALID_PASSWORD)", async () => {
        const service = new AuthService(users(), auth(), mailer(), new FakeRoster([yamada]));

        await expect(service.login("20240001", "wrongpass1")).rejects.toMatchObject({ statusCode: 400, code: "INVALID_PASSWORD" });
    });

    it("A8 名簿から消えていれば、パスワードが合っても断る(404 USER_NOT_FOUND。Q13)", async () => {
        const service = new AuthService(users(), auth(), mailer(), new FakeRoster([]));

        await expect(service.login("20240001", "password123")).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
    });
});

describe("refreshSession(リフレッシュトークンでセッションを続ける)", () => {
    it("A9 名簿から消えていれば、断る(404 USER_NOT_FOUND。Q13)", async () => {
        const token = jwtLib.signRefreshToken({ sub: "user-1" });
        const service = new AuthService(
            users(),
            auth({ findRefreshToken: async () => ({ id: "rt-1", token, userId: "user-1", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() }) }),
            mailer(),
            new FakeRoster([]),
        );

        await expect(service.refreshSession(token)).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
    });
});
