import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/domain-error.js";
import { hashToken } from "@/lib/session-token.js";
import { notUsed } from "@/test/fake-roster.js";
import type { UserRecord } from "@/features/auth/auth.types.js";
import { TabletDeviceService } from "./tablet-device.service.js";
import type { CredentialVerifier, DeviceStore, TabletDeviceRecord } from "./tablet-device.types.js";

const now = new Date("2026-10-29T03:00:00Z");
const admin: UserRecord = { id: "admin-1", studentId: "90240001", passwordHash: "x", role: "ADMIN", isActive: true };
const member: UserRecord = { ...admin, id: "user-1", studentId: "20240001", role: "MEMBER" };

const device = (overrides: Partial<TabletDeviceRecord> = {}): TabletDeviceRecord => ({
    id: "device-1",
    name: "図書室入口",
    createdAt: new Date("2026-10-29T00:00:00Z"),
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
});

const store = (overrides: Partial<DeviceStore> = {}): DeviceStore => ({
    create: notUsed,
    findByTokenHash: notUsed,
    findById: notUsed,
    findActive: notUsed,
    touch: notUsed,
    revoke: notUsed,
    ...overrides,
});

// 学籍番号とパスワードの確かめは、AuthServiceのテストで見ている。ここでは結果だけを差し替える
const verifier = (user: UserRecord | "wrong"): CredentialVerifier => ({
    verifyCredentials: async () => {
        if (user === "wrong") throw new DomainError("INVALID_CREDENTIALS");
        return { user };
    },
});

describe("register(タブレットで端末を登録する)", () => {
    describe("正常系", () => {
        it("DR1 管理者の学籍番号とパスワードが合えば、名前と番号のハッシュと登録した人を保存し、番号を返す(R-A1・D2)", async () => {
            const created: Parameters<DeviceStore["create"]>[0][] = [];
            const service = new TabletDeviceService(store({ create: async (data) => (created.push(data), device({ name: data.name })) }), verifier(admin));

            const result = await service.register({ studentId: "90240001", password: "password123", name: "図書室入口" });

            expect(created).toEqual([{ name: "図書室入口", tokenHash: hashToken(result.token), registeredById: "admin-1" }]);
            expect(result.device.name).toBe("図書室入口");
        });
    });

    describe("異常系", () => {
        it("DR2 学籍番号かパスワードが違えば、登録せずに断る(INVALID_CREDENTIALS)", async () => {
            const service = new TabletDeviceService(store(), verifier("wrong"));

            await expect(service.register({ studentId: "90240001", password: "wrong", name: "図書室入口" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        });

        it("DR3 管理者でなければ、パスワードが合っても登録せずに断る(FORBIDDEN。UC-20の例外)", async () => {
            const service = new TabletDeviceService(store(), verifier(member));

            await expect(service.register({ studentId: "20240001", password: "password123", name: "図書室入口" })).rejects.toMatchObject({ code: "FORBIDDEN" });
        });
    });
});

describe("authenticate(タブレットのAPIを呼んだ端末を確かめる)", () => {
    describe("正常系", () => {
        it("DA1 登録された端末なら、その端末を返し、最後に使った日時を書き換える(R-A1)", async () => {
            const touched: [string, Date][] = [];
            const service = new TabletDeviceService(
                store({ findByTokenHash: async (hash) => (hash === hashToken("device-token") ? device() : null), touch: async (id, at) => void touched.push([id, at]) }),
                verifier(admin),
            );

            const result = await service.authenticate("device-token", now);

            expect(result.id).toBe("device-1");
            expect(touched).toEqual([["device-1", now]]);
        });
    });

    describe("異常系", () => {
        it("DA2 番号が無ければ(Cookieが無い)、DBを見ずに断る(DEVICE_NOT_REGISTERED。R-A2)", async () => {
            const service = new TabletDeviceService(store(), verifier(admin));

            await expect(service.authenticate(undefined, now)).rejects.toMatchObject({ code: "DEVICE_NOT_REGISTERED" });
        });

        it("DA3 取り消した端末なら、断り、最後に使った日時も書き換えない(R-A3)", async () => {
            const service = new TabletDeviceService(store({ findByTokenHash: async () => device({ revokedAt: now }) }), verifier(admin));

            await expect(service.authenticate("device-token", now)).rejects.toMatchObject({ code: "DEVICE_NOT_REGISTERED" });
        });
    });
});

describe("list・revoke(管理者が端末を見る・取り消す)", () => {
    describe("正常系", () => {
        it("DL1 取り消していない端末の一覧を返す(UC-20)", async () => {
            const service = new TabletDeviceService(store({ findActive: async () => [device()] }), verifier(admin));

            expect((await service.list()).map((d) => d.id)).toEqual(["device-1"]);
        });

        it("DL2 取り消すと、取り消した日時を入れる(行は消さない。R-A3・D4)", async () => {
            const revoked: [string, Date][] = [];
            const service = new TabletDeviceService(store({ findById: async () => device(), revoke: async (id, at) => void revoked.push([id, at]) }), verifier(admin));

            await service.revoke("device-1", now);

            expect(revoked).toEqual([["device-1", now]]);
        });
    });

    describe("異常系", () => {
        it("DL3 無い端末を取り消そうとしたら、断る(NOT_FOUND)", async () => {
            const service = new TabletDeviceService(store({ findById: async () => null }), verifier(admin));

            await expect(service.revoke("device-x", now)).rejects.toMatchObject({ code: "NOT_FOUND" });
        });
    });

    describe("境界値", () => {
        it("DL4 取り消し済みの端末をもう一度取り消しても、失敗にせず、日時も変えない(何度押してもよい)", async () => {
            const service = new TabletDeviceService(store({ findById: async () => device({ revokedAt: now }), revoke: notUsed }), verifier(admin));

            await expect(service.revoke("device-1", now)).resolves.toBeUndefined();
        });
    });
});
