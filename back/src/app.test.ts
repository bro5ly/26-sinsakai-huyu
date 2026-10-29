import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { hashToken, newCode, newToken } from "@/lib/session-token.js";
import { bcryptPasswords } from "@/lib/password.js";
import { PASSWORD_FAILURE_LIMIT } from "@/lib/rate-limit.js";
import type { SessionRecord } from "@/features/auth/auth.types.js";
import type { TabletDeviceRecord } from "@/features/tablet-devices/tablet-device.types.js";
import type { CardHolderRecord } from "@/features/tablet-sessions/tablet-session.types.js";
import type { Deps } from "@/deps.js";
import { loadConfig } from "@/config.js";
import { categoriesSchema, currentTabletDeviceSchema, tabletDeviceSchema, tabletDevicesSchema, itemTypeDetailSchema, itemTypesSchema, meSchema, myRentalsSchema, sessionSchema, verificationTokenSchema, tabletSessionSchema, rentalSchema } from "@sinsakai/shared";
import { createApp } from "./app.js";

// HTTPを通して、URL・ステータス・応答の形・Cookieを守るテスト(docs/backlog.md 0.7 C1の②)。
// 判断の細かい場合分けは各serviceのテストにあるので、ここは「つながっているか」と「形」だけを見る。
// 名前に「現状:」が付いたものは、docs/api.md の形に移すときに変わると決まっている今の形({ success: true, ...data } など)
let passwordHash = "";
let pinHash = "";
beforeAll(async () => {
    passwordHash = await bcrypt.hash("password123", 4);
    pinHash = await bcrypt.hash("8068", 4);
});

const yamada = rosterEntry({ studentId: "20240001", name: "山田 太郎", email: "yamada@example.com", serialNumber: "IC-CARD-001", grade: "2年", major: "情報工学科" });
const newcomer = rosterEntry({ studentId: "20260001", name: "テスト 太郎", email: "taro@example.com", serialNumber: "SN-001" });
const registered = () => ({ id: "user-1", studentId: "20240001", passwordHash, role: "MEMBER" as const, isActive: true, loginFailedAttempts: 0, loginLockedUntil: null });
const adminUser = () => ({ ...registered(), id: "admin-1", studentId: "90240001", role: "ADMIN" as const });
const takahashi = rosterEntry({ studentId: "90240001", name: "高橋 先生", email: "admin@example.com", serialNumber: "IC-CARD-ADMIN", userType: "FACULTY" });

// カタログの種類。使える物が1つ、貸出中が1つ、廃棄済みが1つ
const macbookType = {
    id: "type-1",
    title: "MacBook",
    genre: { id: "genre-1", name: "ノートパソコン" },
    category: { id: "cat-1", name: "電子機器" },
    imageUrl: null,
    rentalPeriodDays: 7,
    description: null,
    author: null,
    publisher: null,
    isbn: null,
    manufacturer: "Apple",
    model: null,
    items: [
        { id: "item-2", location: "A棟-2F-101", status: "AVAILABLE" as const, hasActiveRental: false },
        { id: "item-1", location: "A棟-2F-101", status: "AVAILABLE" as const, hasActiveRental: true },
        { id: "item-9", location: null, status: "DISPOSED" as const, hasActiveRental: false },
    ],
};
const rental = { id: "rental-1", rentedAt: new Date("2026-10-24T00:00:00Z"), dueDate: new Date("2099-01-01T00:00:00Z"), returnedAt: null };
const rentalItemType = { id: "type-1", title: "MacBook", genre: { id: "genre-1", name: "ノートパソコン" } };

// 設定はテストの中で決める(環境変数は読まない)
const testConfig = loadConfig({ DATABASE_URL: "unused" });
const frontendUrl = testConfig.frontendUrl;

// はじめからDBにあるセッション。Webのログイン中・期限切れ・タブレット用(Webでは通らない)
const WEB_TOKEN = "web-token-1";
const EXPIRED_TOKEN = "expired-token-1";
// タブレットのセッション。device-1 で作った、今使える物(Webでは通らない)と、無操作30秒を過ぎた物
const TABLET_KIND_TOKEN = "tablet-kind-token-1";
const IDLE_TABLET_TOKEN = "idle-tablet-token-1";
const REGISTRATION_TOKEN = "registration-token-1";
const member = { id: "user-1", role: "MEMBER" as const, isActive: true };
const ADMIN_WEB_TOKEN = "admin-web-token-1";
const initialSessions = (): Map<string, SessionRecord> =>
    new Map([
        [hashToken(WEB_TOKEN), { kind: "WEB", expiresAt: new Date("2099-01-01"), createdAt: new Date("2026-10-29"), deviceId: null, lastUsedAt: null, user: member }],
        [hashToken(EXPIRED_TOKEN), { kind: "WEB", expiresAt: new Date("2000-01-01"), createdAt: new Date("1999-12-25"), deviceId: null, lastUsedAt: null, user: member }],
        [hashToken(TABLET_KIND_TOKEN), { kind: "TABLET", expiresAt: new Date(Date.now() + 180_000), createdAt: new Date(), deviceId: "device-1", lastUsedAt: null, user: member }],
        [hashToken(IDLE_TABLET_TOKEN), { kind: "TABLET", expiresAt: new Date(Date.now() + 180_000), createdAt: new Date(Date.now() - 60_000), deviceId: "device-1", lastUsedAt: new Date(Date.now() - 31_000), user: member }],
        [hashToken(ADMIN_WEB_TOKEN), { kind: "WEB", expiresAt: new Date("2099-01-01"), createdAt: new Date("2026-10-29"), deviceId: null, lastUsedAt: null, user: { id: "admin-1", role: "ADMIN", isActive: true } }],
    ]);

// はじめからDBにあるタブレットの端末。登録されたものと、取り消したもの
const DEVICE_TOKEN = "device-token-1";
const REVOKED_DEVICE_TOKEN = "revoked-device-token-1";
const initialDevices = (): Map<string, TabletDeviceRecord> =>
    new Map([
        [hashToken(DEVICE_TOKEN), { id: "device-1", name: "図書室入口", createdAt: new Date("2026-10-29T00:00:00Z"), lastUsedAt: null, revokedAt: null }],
        [hashToken(REVOKED_DEVICE_TOKEN), { id: "device-2", name: "職員室前", createdAt: new Date("2026-10-28T00:00:00Z"), lastUsedAt: null, revokedAt: new Date("2026-10-29T00:00:00Z") }],
    ]);

// 本物と同じ形の部品を偽物で作る。テストごとに一部だけ差し替える
const fakeDeps = (overrides: Partial<Deps> = {}) => {
    const sentMails: { to: string; code: string }[] = [];
    const sessions = initialSessions();
    const deletedSessionHashes: string[] = [];
    const savedPins: { userId: string; pinHash: string }[] = [];
    const devices = initialDevices();
    const createdDevices: { name: string; registeredById: string }[] = [];
    const cardHolder: CardHolderRecord = { id: "user-1", role: "MEMBER", isActive: true, pinHash, pinFailedAttempts: 0, pinLockedAt: null };
    const pinAttempts: { userId: string; failedAttempts: number; lockedAt: Date | null }[] = [];
    const rentalWrites: { kind: "rent" | "return"; deviceId: string }[] = [];
    const deviceById = (id: string) => [...devices.values()].find((d) => d.id === id) ?? null;
    const deps: Deps = {
        users: {
            create: async ({ studentId }) => ({ ...registered(), id: "user-new", studentId }),
            findById: async (id) => (id === "user-1" ? registered() : null),
            findByStudentId: async (studentId) => (studentId === "20240001" ? registered() : studentId === "90240001" ? adminUser() : null),
            saveLoginAttempt: async () => undefined,
        },
        auth: {
            saveTmpCode: async () => undefined as never,
            saveCodeAttempts: async () => undefined,
            checkTmpCode: async () => ({ studentId: "20260001", codeHash: hashToken("123456"), expiresAt: new Date("2099-01-01"), tokenHash: null, attempts: 0 }),
            deleteTmpCode: async () => undefined as never,
            saveRegistrationToken: async () => undefined,
            findByRegistrationTokenHash: async (hash) => (hash === hashToken(REGISTRATION_TOKEN) ? { studentId: "20260001", tokenExpiresAt: new Date("2099-01-01") } : null),
        },
        sessions: {
            create: async ({ tokenHash, userId, kind, expiresAt, deviceId }) => {
                sessions.set(tokenHash, { kind, expiresAt, createdAt: new Date(), deviceId: deviceId ?? null, lastUsedAt: null, user: { ...member, id: userId } });
            },
            touch: async (hash, now) => {
                const session = sessions.get(hash);
                if (session) session.lastUsedAt = now;
            },
            findByTokenHash: async (hash) => sessions.get(hash) ?? null,
            deleteByTokenHash: async (hash) => {
                deletedSessionHashes.push(hash);
                sessions.delete(hash);
            },
        },
        mailer: {
            sendCode: async (to, code) => {
                sentMails.push({ to, code });
                return undefined as never;
            },
        },
        roster: new FakeRoster([yamada, newcomer, takahashi]),
        catalog: {
            findCategories: async () => [{ id: "cat-1", name: "電子機器", genres: [{ id: "genre-1", name: "ノートパソコン" }] }],
            findItemTypes: async () => [macbookType],
            findItemType: async (id) => (id === macbookType.id ? macbookType : null),
        },
        me: {
            findUser: async (userId) =>
                userId === "user-1"
                    ? { id: "user-1", studentId: "20240001", role: "MEMBER", canBorrow: true, maxItems: 3, suspendedUntil: null, pin: { registered: true, locked: false } }
                    : null,
            findActiveRentals: async () => [
                {
                    id: "rental-1",
                    rentedAt: rental.rentedAt,
                    dueDate: rental.dueDate,
                    returnedAt: null,
                    item: { id: "item-2" },
                    itemType: { id: "type-1", title: "MacBook", genre: { id: "genre-1", name: "ノートパソコン" } },
                },
            ],
            findPasswordHash: async (userId) => (userId === "user-1" ? passwordHash : null),
            savePin: async (data) => {
                savedPins.push(data);
            },
        },
        // MAC-002 は貸し出せる。MAC-001 は山田さんが借りている(返却の確かめ用)
        rentals: {
            findItemForCheckout: async (barcode) => (barcode === "MAC-002" ? { id: "item-2", status: "AVAILABLE", hasActiveRental: false, rentalPeriodDays: 7 } : null),
            findBorrower: async (userId) => (userId === "user-1" ? { canBorrow: true, maxItems: 3, suspendedUntil: null, activeDueDates: [] } : null),
            createRental: async (data) => {
                rentalWrites.push({ kind: "rent", deviceId: data.deviceId });
                return { ...rental, rentedAt: data.rentedAt, dueDate: data.dueDate, item: { id: data.itemId }, itemType: rentalItemType };
            },
            returnByBarcode: async (data) => {
                if (data.barcode !== "MAC-001") return null;
                rentalWrites.push({ kind: "return", deviceId: data.deviceId });
                return { ...rental, returnedAt: data.returnedAt, item: { id: "item-1" }, itemType: rentalItemType };
            },
        },
        // 山田 太郎(IC-CARD-001)はPIN「8068」を登録済み。ほかの人はPIN未登録
        cardHolders: {
            findByStudentId: async (studentId) => (studentId === "20240001" ? cardHolder : null),
            savePinAttempt: async (data) => {
                pinAttempts.push(data);
            },
        },
        devices: {
            create: async ({ name, tokenHash, registeredById }) => {
                const record = { id: `device-new-${devices.size}`, name, createdAt: new Date("2026-10-29T03:00:00Z"), lastUsedAt: null, revokedAt: null };
                devices.set(tokenHash, record);
                createdDevices.push({ name, registeredById });
                return record;
            },
            findByTokenHash: async (hash) => devices.get(hash) ?? null,
            findById: async (id) => deviceById(id),
            findActive: async () => [...devices.values()].filter((d) => !d.revokedAt),
            touch: async (id, now) => {
                const device = deviceById(id);
                if (device) device.lastUsedAt = now;
            },
            revoke: async (id, now) => {
                const device = deviceById(id);
                if (device) device.revokedAt = now;
            },
        },
        passwords: bcryptPasswords,
        secrets: { newCode, newToken },
        ...overrides,
    };
    return { app: createApp(deps, testConfig), sentMails, deletedSessionHashes, savedPins, devices, createdDevices, pinAttempts, sessions, rentalWrites };
};

type App = ReturnType<typeof fakeDeps>["app"];
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const sessionCookie = (token: string) => ({ Cookie: `session=${token}` });
const webSession = sessionCookie(WEB_TOKEN);
const sessionCookieOf = (res: request.Response) => ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("session="));
// 書き換えのリクエストは、画面のURLのOriginが無いと断られる(A8-7)。ブラウザと同じく付けて送る
const post = (app: App, url: string) => request(app).post(url).set("Origin", frontendUrl);
// タブレットのAPIは、登録された端末のCookieが要る(D5)
const deviceCookie = (token: string) => ({ Cookie: `device=${token}` });
const tabletPost = (app: App, url: string) => post(app, url).set(deviceCookie(DEVICE_TOKEN));
const deviceCookieOf = (res: request.Response) => ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("device="));

const expectProblem = (res: request.Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({ status, code });
};

describe("POST /api/sessions(ログイン)", () => {
    describe("正常系", () => {
        it("H1 学籍番号とパスワードが合えば、201でSessionの形(利用者だけ)を返し、セッションの番号はHttpOnly・SameSite=Strict・7日のCookieにだけ入れる(R-11。A8-3・A8-6・A8-7)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "password123" });

            expect(res.status).toBe(201);
            expect(sessionSchema.parse(res.body)).toEqual({
                user: { id: "user-1", studentId: "20240001", name: "山田 太郎", userType: "STUDENT", role: "MEMBER" },
            });
            expect(res.body).not.toHaveProperty("success");
            expect(res.body).not.toHaveProperty("accessToken");
            const cookie = sessionCookieOf(res);
            expect(cookie).toMatch(/HttpOnly/);
            expect(cookie).toMatch(/SameSite=Strict/);
            expect(cookie).toMatch(/Path=\//);
            expect(cookie).toMatch(/Max-Age=604800/);
        });
    });

    describe("異常系", () => {
        it("H2 パスワードが違えば、401 INVALID_CREDENTIALSをRFC 9457の形で返す(R-16)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "wrong-password" });

            expectProblem(res, 401, "INVALID_CREDENTIALS");
            expect(sessionCookieOf(res)).toBeUndefined();
        });

        it("H31 7文字以下の違うパスワードでも、8文字以上のときと同じく401 INVALID_CREDENTIALSを返す(長さは登録のときだけ確かめる。2026-10-25 B1-A)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "wrong" });

            expectProblem(res, 401, "INVALID_CREDENTIALS");
        });

        it("H3 入力が足りなければ、400 VALIDATION_ERRORで、足りない項目をerrorsに入れる", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/sessions").send({});

            expectProblem(res, 400, "VALIDATION_ERROR");
            expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual(["password", "studentId"]);
        });
    });
});

describe("登録(認証コードの申請 → 確認 → パスワードを決める)", () => {
    describe("正常系", () => {
        it("H4 名簿にいて未登録なら、202を本文なしで返し、名簿のメールに6桁のコードを送る(R-4。docs/api.md 4.1)", async () => {
            const { app, sentMails } = fakeDeps();

            const res = await post(app, "/api/verification-codes").send({ studentId: "20260001", purpose: "signup" });

            expect(res.status).toBe(202);
            expect(res.text).toBe("");
            expect(sentMails).toEqual([{ to: "taro@example.com", code: expect.stringMatching(/^\d{6}$/) }]);
        });

        it("H5 認証コードが合えば、201で登録用トークンと期限を返す(R-6。docs/api.md 4.1)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/verification-tokens").send({ studentId: "20260001", purpose: "signup", code: "123456" });

            expect(res.status).toBe(201);
            expect(verificationTokenSchema.parse(res.body)).toEqual({ token: expect.any(String), expiresAt: expect.any(String) });
        });

        it("H6 登録用トークンでパスワードを決めれば、201でSessionの形を返し、セッションの番号をCookieに入れる(R-9)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/users").send({ token: REGISTRATION_TOKEN, password: "password123" });

            expect(res.status).toBe(201);
            expect(sessionSchema.parse(res.body).user).toMatchObject({ id: "user-new", studentId: "20260001", name: "テスト 太郎" });
            expect(res.body).not.toHaveProperty("accessToken");
            expect(sessionCookieOf(res)).toMatch(/HttpOnly/);
        });
    });

    describe("異常系", () => {
        it("H28 名簿に無い学籍番号でも、名簿にいるときと同じく202を本文なしで返し、メールは送らない(R-16。列挙の対策)", async () => {
            const { app, sentMails } = fakeDeps();

            const res = await post(app, "/api/verification-codes").send({ studentId: "99999999", purpose: "signup" });

            expect(res.status).toBe(202);
            expect(res.text).toBe("");
            expect(sentMails).toEqual([]);
        });

        it("H39 DBに無い登録用トークン(でたらめ・使用済み)なら、401 INVALID_TOKENを返す(A8-8)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/users").send({ token: "unknown-token", password: "password123" });

            expectProblem(res, 401, "INVALID_TOKEN");
        });

        it("H29 purposeが\"signup\"でなければ、400 VALIDATION_ERROR(パスワードの再設定はまだ無い。A2)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/verification-codes").send({ studentId: "20260001", purpose: "password-reset" });

            expectProblem(res, 400, "VALIDATION_ERROR");
        });
    });
});

describe("セッション(ログイン中・ログアウト)", () => {
    describe("正常系", () => {
        it("H7 ログインで受け取ったCookieを付ければ、ログインが要るAPIが通る(A8-3)", async () => {
            const { app } = fakeDeps();
            const agent = request.agent(app);
            await agent.post("/api/sessions").set("Origin", frontendUrl).send({ studentId: "20240001", password: "password123" });

            const res = await agent.get("/api/me");

            expect(res.status).toBe(200);
            expect(meSchema.parse(res.body).id).toBe("user-1");
        });

        it("H8 ログアウトすれば、204を本文なしで返し、セッションのCookieとDBのセッションを消す。そのCookieはもう通らない(R-15)", async () => {
            const { app, deletedSessionHashes } = fakeDeps();

            const logout = await request(app).delete("/api/sessions/current").set("Origin", frontendUrl).set(webSession);

            expect(logout.status).toBe(204);
            expect(logout.text).toBe("");
            expect(sessionCookieOf(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);
            expect(deletedSessionHashes).toEqual([hashToken(WEB_TOKEN)]);
            expectProblem(await request(app).get("/api/me").set(webSession), 401, "UNAUTHENTICATED");
        });
    });

    describe("異常系", () => {
        it("H9 リフレッシュのURLは無くした(セッションは7日続くので要らない。A8-3)。404 NOT_FOUNDを返す", async () => {
            const { app } = fakeDeps();

            expectProblem(await post(app, "/api/sessions/refresh").set(webSession), 404, "NOT_FOUND");
        });

        it("H40 期限が切れたセッションなら、401 UNAUTHENTICATEDを返す(A8-6)", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/me").set(sessionCookie(EXPIRED_TOKEN)), 401, "UNAUTHENTICATED");
        });

        it("H41 タブレットのセッションでは、Webのログインが要るAPIは通らない(R-A18)", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/me").set(sessionCookie(TABLET_KIND_TOKEN)), 401, "UNAUTHENTICATED");
        });

        it("H42 アクセストークン(Authorization: Bearer)はもう受け付けない(A8-3)", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/me").set(bearer(TABLET_KIND_TOKEN)), 401, "UNAUTHENTICATED");
        });

        it("H30 古いURL(/api/auth/...)は残さず、404 NOT_FOUNDを返す(API-Q8)", async () => {
            const { app } = fakeDeps();

            for (const url of ["/api/auth/login", "/api/auth/signup", "/api/auth/request-verification", "/api/auth/verify-code", "/api/auth/refreshSession", "/api/auth/logout"]) {
                expectProblem(await post(app, url).send({}), 404, "NOT_FOUND");
            }
        });
    });
});

describe("CSRFの対策(書き換えのリクエストはOriginを確かめる。A8-7・A8-11)", () => {
    describe("正常系", () => {
        it("H43 読むだけのリクエスト(GET)は、Originが無くても通す", async () => {
            const { app } = fakeDeps();

            expect((await request(app).get("/api/me").set(webSession)).status).toBe(200);
        });
    });

    describe("異常系", () => {
        it("H44 Originが無い書き換えのリクエストは、Cookieがあっても、403 FORBIDDEN_ORIGINで断り、中身を見ない", async () => {
            const { app } = fakeDeps({ sessions: { create: notUsed, findByTokenHash: notUsed, touch: notUsed, deleteByTokenHash: notUsed } });

            expectProblem(await request(app).delete("/api/sessions/current").set(webSession), 403, "FORBIDDEN_ORIGIN");
            expectProblem(await request(app).post("/api/sessions").send({ studentId: "20240001", password: "password123" }), 403, "FORBIDDEN_ORIGIN");
        });

        it("H45 ほかのサイトのOriginなら、403 FORBIDDEN_ORIGINで断る(似た名前のサイトも通さない)", async () => {
            const { app } = fakeDeps();

            for (const origin of ["https://evil.example.com", `${frontendUrl}.evil.example.com`, "null"]) {
                expectProblem(await request(app).post("/api/sessions").set("Origin", origin).send({ studentId: "20240001", password: "password123" }), 403, "FORBIDDEN_ORIGIN");
            }
        });
    });
});

describe("カタログ(GET /api/item-types・/api/item-types/{id}・/api/categories)", () => {
    describe("正常系", () => {
        it("H10 GET /api/item-typesは200で、種類ごとの貸し出せる数と全数(廃棄済みを除く)を{ items }で返す(docs/api.md 4.3。Ca4)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/item-types").set(webSession);

            expect(res.status).toBe(200);
            expect(itemTypesSchema.parse(res.body).items).toEqual([
                {
                    id: "type-1",
                    title: "MacBook",
                    genre: { id: "genre-1", name: "ノートパソコン" },
                    category: { id: "cat-1", name: "電子機器" },
                    imageUrl: null,
                    rentalPeriodDays: 7,
                    availableCount: 1,
                    totalCount: 2,
                },
            ]);
        });

        it("H34 GET /api/item-types/{id}は200で、物品1つ1つの状態付きの詳細を返す(廃棄済みは入れない)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/item-types/type-1").set(webSession);

            expect(res.status).toBe(200);
            expect(itemTypeDetailSchema.parse(res.body).items).toEqual([
                { id: "item-2", location: "A棟-2F-101", state: "AVAILABLE" },
                { id: "item-1", location: "A棟-2F-101", state: "RENTED" },
            ]);
        });

        it("H35 GET /api/categoriesは200で、カテゴリをジャンル付きで{ items }で返す(絞り込みの選択肢)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/categories").set(webSession);

            expect(res.status).toBe(200);
            expect(categoriesSchema.parse(res.body)).toEqual({ items: [{ id: "cat-1", name: "電子機器", genres: [{ id: "genre-1", name: "ノートパソコン" }] }] });
        });
    });

    describe("異常系", () => {
        it("H36 無い種類のIDなら、404 NOT_FOUNDを返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/item-types/type-x").set(webSession);

            expectProblem(res, 404, "NOT_FOUND");
        });

        it("H37 ログインしていなければ、3本とも401 UNAUTHENTICATEDを返す(カタログはログイン必須。Q11)", async () => {
            const { app } = fakeDeps();

            for (const url of ["/api/item-types", "/api/item-types/type-1", "/api/categories"]) {
                expectProblem(await request(app).get(url), 401, "UNAUTHENTICATED");
            }
        });

        it("H38 古いURL(GET /api/items)は残さず、404 NOT_FOUNDを返す(API-Q8)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items").set(webSession);

            expectProblem(res, 404, "NOT_FOUND");
        });
    });
});

describe("GET /api/me・GET /api/me/rentals(本人)", () => {
    describe("正常系", () => {
        it("H11 Webのセッションがあれば、GET /api/meは200でMeの形(名簿の項目・貸し出しの決まり)を返す。カードの番号は返さない(docs/api.md 4.2。2026-10-29 G0)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/me").set(webSession);

            expect(res.status).toBe(200);
            expect(meSchema.parse(res.body)).toEqual({
                id: "user-1",
                name: "山田 太郎",
                studentId: "20240001",
                userType: "STUDENT",
                role: "MEMBER",
                email: "yamada@example.com",
                grade: "2年",
                major: "情報工学科",
                borrowing: { canBorrow: true, maxItems: 3, suspendedUntil: null, activeCount: 1, hasOverdue: false },
                pin: { registered: true, locked: false },
            });
            expect(res.body).not.toHaveProperty("success");
            // カードの番号が画面に出ると、撮られた画面がカードの写しになる(A-Q6・G0)
            expect(JSON.stringify(res.body)).not.toContain("IC-CARD-001");
        });

        it("H32 GET /api/me/rentalsは200で、借りている物を{ items }に入れ、状態とジャンル付きで返す(Me3)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/me/rentals").set(webSession);

            expect(res.status).toBe(200);
            expect(myRentalsSchema.parse(res.body)).toEqual({
                items: [
                    {
                        id: "rental-1",
                        itemType: { id: "type-1", title: "MacBook", genre: { id: "genre-1", name: "ノートパソコン" } },
                        item: { id: "item-2" },
                        rentedAt: "2026-10-24T00:00:00.000Z",
                        dueDate: "2099-01-01T00:00:00.000Z",
                        returnedAt: null,
                        state: "RENTING",
                    },
                ],
            });
        });
    });

    describe("異常系", () => {
        it("H12 セッションのCookieが無ければ、どちらも401 UNAUTHENTICATEDを返す", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/me"), 401, "UNAUTHENTICATED");
            expectProblem(await request(app).get("/api/me/rentals"), 401, "UNAUTHENTICATED");
        });

        it("H13 でたらめなセッションの番号なら、401 UNAUTHENTICATEDを返す(500にしない)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/me").set(sessionCookie("broken"));

            expectProblem(res, 401, "UNAUTHENTICATED");
        });

        it("H33 古いURL(/api/items/me)は残さず、404 NOT_FOUNDを返す(API-Q8)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items/me").set(webSession);

            expectProblem(res, 404, "NOT_FOUND");
        });
    });
});

describe("PUT /api/me/pin(タブレット用のPINの登録・変更)", () => {
    const putPin = (app: App, body: object) => request(app).put("/api/me/pin").set("Origin", frontendUrl).set(webSession).send(body);

    describe("正常系", () => {
        it("H46 パスワードが合えば、204を本文なしで返し、PINのハッシュを保存する(UC-7・R-A5・P1)", async () => {
            const { app, savedPins } = fakeDeps();

            const res = await putPin(app, { pin: "8068", password: "password123" });

            expect(res.status).toBe(204);
            expect(res.text).toBe("");
            expect(savedPins.map((p) => p.userId)).toEqual(["user-1"]);
        });
    });

    describe("異常系", () => {
        it("H47 入れ直したパスワードが違えば、403 WRONG_PASSWORDを返し、保存しない(P1・P5)", async () => {
            const { app, savedPins } = fakeDeps();

            expectProblem(await putPin(app, { pin: "8068", password: "wrong-password" }), 403, "WRONG_PASSWORD");
            expect(savedPins).toEqual([]);
        });

        it("H48 推測しやすいPIN・4桁の数字でないPINは、400 VALIDATION_ERRORで、errorsにpinを入れる(P2)", async () => {
            const { app, savedPins } = fakeDeps();

            for (const pin of ["1234", "0000", "123", "12a4"]) {
                const res = await putPin(app, { pin, password: "password123" });
                expectProblem(res, 400, "VALIDATION_ERROR");
                expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(["pin"]);
            }
            expect(savedPins).toEqual([]);
        });

        it("H49 ログインしていなければ、401 UNAUTHENTICATED", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).put("/api/me/pin").set("Origin", frontendUrl).send({ pin: "8068", password: "password123" }), 401, "UNAUTHENTICATED");
        });
    });

    describe("境界値", () => {
        it("H50 失敗は接続元ごとに15分で100回まで。101回目は、パスワードを確かめずに429 RATE_LIMITED(P6・F2)", async () => {
            const { app, savedPins } = fakeDeps();
            for (let i = 0; i < PASSWORD_FAILURE_LIMIT; i++) await putPin(app, { pin: "8068", password: "wrong-password" });

            expectProblem(await putPin(app, { pin: "8068", password: "password123" }), 429, "RATE_LIMITED");
            expect(savedPins).toEqual([]);
        });
    });
});

describe("タブレットの端末の登録(POST /api/tablet-devices。UC-20・D2)", () => {
    const register = (app: App, body: object) => post(app, "/api/tablet-devices").send(body);

    describe("正常系", () => {
        it("H51 管理者の学籍番号とパスワードが合えば、201でTabletDeviceを返し、番号はHttpOnly・SameSite=Strict・400日のCookieにだけ入れる(R-A1・D3)", async () => {
            const { app, createdDevices } = fakeDeps();

            const res = await register(app, { studentId: "90240001", password: "password123", name: "図書室入口" });

            expect(res.status).toBe(201);
            expect(tabletDeviceSchema.parse(res.body)).toMatchObject({ name: "図書室入口", lastUsedAt: null });
            expect(Object.keys(res.body).sort()).toEqual(["createdAt", "id", "lastUsedAt", "name"]);
            const cookie = deviceCookieOf(res);
            expect(cookie).toMatch(/HttpOnly/);
            expect(cookie).toMatch(/SameSite=Strict/);
            expect(cookie).toMatch(/Max-Age=34560000/);
            expect(createdDevices).toEqual([{ name: "図書室入口", registeredById: "admin-1" }]);
            // Webのセッションは作らない(D2)
            expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).some((c) => c.startsWith("session="))).toBe(false);
        });
    });

    describe("異常系", () => {
        it("H52 管理者でなければ、パスワードが合っても403 FORBIDDENで、登録しない", async () => {
            const { app, createdDevices } = fakeDeps();

            expectProblem(await register(app, { studentId: "20240001", password: "password123", name: "図書室入口" }), 403, "FORBIDDEN");
            expect(createdDevices).toEqual([]);
        });

        it("H53 パスワードが違えば、401 INVALID_CREDENTIALS", async () => {
            const { app } = fakeDeps();

            expectProblem(await register(app, { studentId: "90240001", password: "wrong-password", name: "図書室入口" }), 401, "INVALID_CREDENTIALS");
        });

        it("H54 端末の名前が空なら、400 VALIDATION_ERRORで、errorsにnameを入れる", async () => {
            const { app } = fakeDeps();

            const res = await register(app, { studentId: "90240001", password: "password123", name: "  " });

            expectProblem(res, 400, "VALIDATION_ERROR");
            expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(["name"]);
        });
    });
});

describe("タブレットのAPIは、登録された端末からだけ(D5。R-A2・R-A3)", () => {
    describe("正常系", () => {
        it("H55 GET /api/tablet/deviceは、端末のCookieがあれば200で端末の名前を返し、最後に使った日時を書き換え、Cookieを付け直す(D3)", async () => {
            const { app, devices } = fakeDeps();

            const res = await request(app).get("/api/tablet/device").set(deviceCookie(DEVICE_TOKEN));

            expect(res.status).toBe(200);
            expect(currentTabletDeviceSchema.parse(res.body)).toEqual({ id: "device-1", name: "図書室入口" });
            expect(devices.get(hashToken(DEVICE_TOKEN))?.lastUsedAt).toBeInstanceOf(Date);
            expect(deviceCookieOf(res)).toMatch(/Max-Age=34560000/);
        });
    });

    describe("異常系", () => {
        it("H56 端末のCookieが無ければ、どのタブレットのAPIも401 DEVICE_NOT_REGISTERED(カードの番号だけでは借りられない)", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/tablet/device"), 401, "DEVICE_NOT_REGISTERED");
            for (const url of ["/api/tablet/sessions", "/api/tablet/rentals", "/api/tablet/returns"]) {
                expectProblem(await post(app, url).send({ cardNumber: "IC-CARD-001", pin: "8068", barcode: "MAC-002" }), 401, "DEVICE_NOT_REGISTERED");
            }
        });

        it("H57 取り消した端末なら、401 DEVICE_NOT_REGISTERED", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/tablet/device").set(deviceCookie(REVOKED_DEVICE_TOKEN)), 401, "DEVICE_NOT_REGISTERED");
        });
    });
});

describe("管理者の端末の一覧と取り消し(/api/admin/tablet-devices。UC-20・D1)", () => {
    const adminSession = sessionCookie(ADMIN_WEB_TOKEN);

    describe("正常系", () => {
        it("H58 管理者のWebのセッションなら、GETは200で取り消していない端末だけを返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/admin/tablet-devices").set(adminSession);

            expect(res.status).toBe(200);
            expect(tabletDevicesSchema.parse(res.body).items.map((d) => d.name)).toEqual(["図書室入口"]);
        });

        it("H59 DELETEで取り消すと204で、その端末は次の呼び出しから401 DEVICE_NOT_REGISTERED(R-A3)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).delete("/api/admin/tablet-devices/device-1").set("Origin", frontendUrl).set(adminSession);

            expect(res.status).toBe(204);
            expectProblem(await request(app).get("/api/tablet/device").set(deviceCookie(DEVICE_TOKEN)), 401, "DEVICE_NOT_REGISTERED");
        });
    });

    describe("異常系", () => {
        it("H60 管理者でないWebのセッションなら、403 FORBIDDEN。ログインしていなければ401 UNAUTHENTICATED(/api/adminの入口で止める)", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).get("/api/admin/tablet-devices").set(webSession), 403, "FORBIDDEN");
            expectProblem(await request(app).delete("/api/admin/tablet-devices/device-1").set("Origin", frontendUrl).set(webSession), 403, "FORBIDDEN");
            expectProblem(await request(app).get("/api/admin/tablet-devices"), 401, "UNAUTHENTICATED");
        });

        it("H61 無い端末を取り消そうとしたら、404 NOT_FOUND", async () => {
            const { app } = fakeDeps();

            expectProblem(await request(app).delete("/api/admin/tablet-devices/device-x").set("Origin", frontendUrl).set(adminSession), 404, "NOT_FOUND");
        });
    });
});

describe("POST /api/tablet/sessions(カードとPINで本人確認。UC-8・判断表T)", () => {
    const startSession = (app: App, body: object) => tabletPost(app, "/api/tablet/sessions").send(body);

    describe("正常系", () => {
        it("H62 カードとPINが合えば、201でセッションの番号と、表示用の名前と借りている物だけを返す(学籍番号・学年・専攻・IDは返さない。R-A13)", async () => {
            const { app } = fakeDeps();

            const res = await startSession(app, { cardNumber: "IC-CARD-001", pin: "8068" });

            expect(res.status).toBe(201);
            const body = tabletSessionSchema.parse(res.body);
            expect(body.user).toEqual({ displayName: "山田 太郎" });
            expect(Object.keys(res.body).sort()).toEqual(["expiresAt", "rentals", "token", "user"]);
            expect(body.rentals).toEqual([{ title: "MacBook", dueDate: "2099-01-01T00:00:00.000Z", state: "RENTING" }]);
            // 作ったセッションで、そのまま貸し出せる
            expect((await tabletPost(app, "/api/tablet/rentals").set(bearer(body.token)).send({ barcode: "MAC-002" })).status).toBe(201);
        });
    });

    describe("異常系", () => {
        it("H63 PINが違う・名簿に無いカード・PIN未登録のカードは、どれも401 INVALID_CARD_OR_PIN(どれかは言わない。T2・T3・T5)", async () => {
            const { app, pinAttempts } = fakeDeps();

            expectProblem(await startSession(app, { cardNumber: "IC-CARD-001", pin: "1357" }), 401, "INVALID_CARD_OR_PIN");
            expectProblem(await startSession(app, { cardNumber: "IC-CARD-999", pin: "8068" }), 401, "INVALID_CARD_OR_PIN");
            expectProblem(await startSession(app, { cardNumber: "IC-CARD-ADMIN", pin: "8068" }), 401, "INVALID_CARD_OR_PIN");
            expect(pinAttempts).toEqual([{ userId: "user-1", failedAttempts: 1, lockedAt: null }]);
        });

        it("H64 PINが4桁の数字でなければ、400 VALIDATION_ERROR", async () => {
            const { app } = fakeDeps();

            const res = await startSession(app, { cardNumber: "IC-CARD-001", pin: "12" });

            expectProblem(res, 400, "VALIDATION_ERROR");
            expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(["pin"]);
        });

        it("H65 古いURL(POST /api/tablet/signin。カードだけで通っていた)は残さず、404 NOT_FOUND", async () => {
            const { app } = fakeDeps();

            expectProblem(await tabletPost(app, "/api/tablet/signin").send({ serialNumber: "IC-CARD-001" }), 404, "NOT_FOUND");
        });
    });
});

describe("タブレットのセッション(終える・時間切れ。R-A9・R-A10)", () => {
    describe("正常系", () => {
        it("H66 DELETE /api/tablet/sessions/currentで終えると204で、そのセッションはもう通らない", async () => {
            const { app } = fakeDeps();

            const res = await request(app).delete("/api/tablet/sessions/current").set("Origin", frontendUrl).set(deviceCookie(DEVICE_TOKEN)).set(bearer(TABLET_KIND_TOKEN));

            expect(res.status).toBe(204);
            expectProblem(await tabletPost(app, "/api/tablet/rentals").set(bearer(TABLET_KIND_TOKEN)).send({ barcode: "MAC-002" }), 401, "UNAUTHENTICATED");
        });
    });

    describe("異常系", () => {
        it("H67 無操作30秒を過ぎたセッションなら、401 SESSION_EXPIRED(もう一度カードを読む)", async () => {
            const { app } = fakeDeps();

            expectProblem(await tabletPost(app, "/api/tablet/rentals").set(bearer(IDLE_TABLET_TOKEN)).send({ barcode: "MAC-002" }), 401, "SESSION_EXPIRED");
        });

        it("H68 Webのセッションの番号は、タブレットでは通らない(R-A18)", async () => {
            const { app } = fakeDeps();

            expectProblem(await tabletPost(app, "/api/tablet/rentals").set(bearer(WEB_TOKEN)).send({ barcode: "MAC-002" }), 401, "UNAUTHENTICATED");
        });
    });
});

describe("POST /api/tablet/rentals(借りる。UC-8・判断表C)", () => {
    describe("正常系", () => {
        it("H16 タブレットのセッションがあれば、201でRentalの形(状態付き・バーコード無し)を返し、借りた端末を記録する(R-19・E3・BC1)", async () => {
            const { app, rentalWrites } = fakeDeps();

            const res = await tabletPost(app, "/api/tablet/rentals").set(bearer(TABLET_KIND_TOKEN)).send({ barcode: "MAC-002" });

            expect(res.status).toBe(201);
            const body = rentalSchema.parse(res.body);
            expect(body).toMatchObject({ item: { id: "item-2" }, itemType: { title: "MacBook" }, state: "RENTING", returnedAt: null });
            expect(res.body.item).not.toHaveProperty("barcode");
            expect(res.body).not.toHaveProperty("success");
            expect(rentalWrites).toEqual([{ kind: "rent", deviceId: "device-1" }]);
        });
    });

    describe("異常系", () => {
        it("H17 タブレットのセッションが無ければ、401 UNAUTHENTICATEDを返し、貸し出さない", async () => {
            // DBに触れたらテストが落ちるようにして、ミドルウェアで止まることを見る
            const { app } = fakeDeps({ rentals: { findItemForCheckout: notUsed, findBorrower: notUsed, createRental: notUsed, returnByBarcode: notUsed } });

            const res = await tabletPost(app, "/api/tablet/rentals").send({ barcode: "MAC-002" });

            expectProblem(res, 401, "UNAUTHENTICATED");
        });

        it("H18 バーコードの物品が無ければ、404 ITEM_NOT_FOUNDを返す(C1)", async () => {
            const { app } = fakeDeps();

            const res = await tabletPost(app, "/api/tablet/rentals").set(bearer(TABLET_KIND_TOKEN)).send({ barcode: "NOPE-001" });

            expectProblem(res, 404, "ITEM_NOT_FOUND");
        });

        it("H69 延滞がある人なら、409 HAS_OVERDUEを返す(C6。判断表Cの細かい場合分けは rental.check.test.ts)", async () => {
            const { app } = fakeDeps({
                rentals: {
                    findItemForCheckout: async () => ({ id: "item-2", status: "AVAILABLE", hasActiveRental: false, rentalPeriodDays: 7 }),
                    findBorrower: async () => ({ canBorrow: true, maxItems: 3, suspendedUntil: null, activeDueDates: [new Date("2000-01-01")] }),
                    createRental: notUsed,
                    returnByBarcode: notUsed,
                },
            });

            expectProblem(await tabletPost(app, "/api/tablet/rentals").set(bearer(TABLET_KIND_TOKEN)).send({ barcode: "MAC-002" }), 409, "HAS_OVERDUE");
        });
    });
});

describe("POST /api/tablet/returns(返す。UC-9)", () => {
    describe("正常系", () => {
        it("H19 登録された端末なら、カードもセッションも無しで201、返却日時入りのRentalを返し、返した端末を記録する(A-Q4・E3・E7)", async () => {
            const { app, rentalWrites } = fakeDeps();

            const res = await tabletPost(app, "/api/tablet/returns").send({ barcode: "MAC-001" });

            expect(res.status).toBe(201);
            expect(rentalSchema.parse(res.body)).toMatchObject({ state: "RETURNED", returnedAt: expect.any(String) });
            expect(res.body.item).not.toHaveProperty("barcode");
            expect(rentalWrites).toEqual([{ kind: "return", deviceId: "device-1" }]);
        });
    });

    describe("異常系", () => {
        it("H70 その物品の返していない貸し出しが無ければ、404 ACTIVE_RENTAL_NOT_FOUND(R-23)", async () => {
            const { app } = fakeDeps();

            expectProblem(await tabletPost(app, "/api/tablet/returns").send({ barcode: "MAC-003" }), 404, "ACTIVE_RENTAL_NOT_FOUND");
        });

        it("H71 古いURL(POST /api/tablet/checkout・return)は残さず、404 NOT_FOUND", async () => {
            const { app } = fakeDeps();

            for (const url of ["/api/tablet/checkout", "/api/tablet/return"]) {
                expectProblem(await tabletPost(app, url).set(bearer(TABLET_KIND_TOKEN)).send({ barcode: "MAC-002" }), 404, "NOT_FOUND");
            }
        });
    });
});

describe("存在しないURL", () => {
    describe("異常系", () => {
        it("H20 どのrouteにも当てはまらなければ、404 NOT_FOUNDをRFC 9457の形で返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/nope");

            expectProblem(res, 404, "NOT_FOUND");
        });
    });
});

describe("すべての応答に付くヘッダ", () => {
    describe("正常系", () => {
        it("H21 helmetのセキュリティのヘッダを付け、Expressを使っていることを出さない(R4)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/item-types");

            expect(res.headers["x-content-type-options"]).toBe("nosniff");
            expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
            expect(res.headers["x-powered-by"]).toBeUndefined();
        });

        it("H22 helmetを付けても、画面(FRONTEND_URL)からのCORSとCookieは今のまま通す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/item-types").set("Origin", "http://localhost:4545");

            expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:4545");
            expect(res.headers["access-control-allow-credentials"]).toBe("true");
        });
    });
});

describe("ログインの回数の制限(接続元ごとに、失敗を15分で100回まで。docs/auth.md 4.6・C5・K9-B・F2)", () => {
    const login = (app: ReturnType<typeof fakeDeps>["app"]) =>
        post(app, "/api/sessions").send({ studentId: "20240001", password: "wrong-password" });

    describe("正常系", () => {
        it("H23 100回目までは、制限せずにいつもどおり答える", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < PASSWORD_FAILURE_LIMIT - 1; i++) await login(app);

            const res = await login(app);

            expectProblem(res, 401, "INVALID_CREDENTIALS");
        });

        it("H27 成功したログインは数えない。同じWi-Fiの大勢が続けてログインしても止めない(2026-10-24 K9-B)", async () => {
            const { app } = fakeDeps();
            const success = () => post(app, "/api/sessions").send({ studentId: "20240001", password: "password123" });
            for (let i = 0; i < 25; i++) await success();
            for (let i = 0; i < PASSWORD_FAILURE_LIMIT - 1; i++) await login(app);

            const res = await success();

            expect(res.status).toBe(201);
        });

        it("H24 ログインのほかのAPI(登録の申請など)は、制限しない", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < PASSWORD_FAILURE_LIMIT; i++) await login(app);

            const res = await post(app, "/api/verification-codes").send({ studentId: "20260001", purpose: "signup" });

            expect(res.status).toBe(202);
        });
    });

    describe("境界値", () => {
        it("H25 101回目は、パスワードを確かめずに429 RATE_LIMITEDをRFC 9457の形で返す", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < PASSWORD_FAILURE_LIMIT; i++) await login(app);

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "password123" });

            expectProblem(res, 429, "RATE_LIMITED");
        });
    });
});

describe("認証コードの申請の回数(学籍番号ごとに1分に1回・1時間に5回。R-5・docs/auth.md 4.6・F5)", () => {
    const requestCode = (app: App, studentId: string) => post(app, "/api/verification-codes").send({ studentId, purpose: "signup" });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("正常系", () => {
        it("H72 1分たてば、同じ学籍番号でもう一度申請できる(新しいコードが届き、前のコードは通らなくなる。R-5)", async () => {
            vi.useFakeTimers({ toFake: ["Date"] });
            const { app, sentMails } = fakeDeps();
            expect((await requestCode(app, "20260001")).status).toBe(202);

            vi.setSystemTime(Date.now() + 61_000);
            expect((await requestCode(app, "20260001")).status).toBe(202);
            expect(sentMails).toHaveLength(2);
        });

        it("H73 学籍番号が違えば、別に数える", async () => {
            const { app } = fakeDeps();
            await requestCode(app, "20260001");

            expect((await requestCode(app, "20260002")).status).toBe(202);
        });
    });

    describe("異常系", () => {
        it("H74 1分以内にもう一度申請したら、429 RATE_LIMITEDで、メールは送らない", async () => {
            const { app, sentMails } = fakeDeps();
            await requestCode(app, "20260001");

            expectProblem(await requestCode(app, "20260001"), 429, "RATE_LIMITED");
            expect(sentMails).toHaveLength(1);
        });

        it("H75 名簿に無い学籍番号でも、同じく2回目は429(名簿にいるかを知られないため。F5・R-2)", async () => {
            const { app } = fakeDeps();
            await requestCode(app, "99999999");

            expectProblem(await requestCode(app, "99999999"), 429, "RATE_LIMITED");
        });
    });

    describe("境界値", () => {
        it("H76 1時間に5回までは送り、6回目は1分あけても429", async () => {
            vi.useFakeTimers({ toFake: ["Date"] });
            const { app, sentMails } = fakeDeps();
            for (let i = 0; i < 5; i++) {
                expect((await requestCode(app, "20260001")).status).toBe(202);
                vi.setSystemTime(Date.now() + 61_000);
            }

            expectProblem(await requestCode(app, "20260001"), 429, "RATE_LIMITED");
            expect(sentMails).toHaveLength(5);
        });
    });
});

describe("タブレットの本人確認の回数(端末ごとに、失敗を1分で20回まで。docs/auth.md 4.6)", () => {
    const startSession = (app: App, body: object) => tabletPost(app, "/api/tablet/sessions").send(body);

    describe("正常系", () => {
        it("H77 本人確認に成功した分は数えない(混む時間でも、普通に借りる人を止めない)", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 25; i++) expect((await startSession(app, { cardNumber: "IC-CARD-001", pin: "8068" })).status).toBe(201);
            for (let i = 0; i < 19; i++) await startSession(app, { cardNumber: "IC-CARD-999", pin: "8068" });

            expect((await startSession(app, { cardNumber: "IC-CARD-001", pin: "8068" })).status).toBe(201);
        });
    });

    describe("境界値", () => {
        it("H78 20回失敗したら、21回目は、カードとPINを確かめずに429 RATE_LIMITED", async () => {
            const { app, pinAttempts } = fakeDeps();
            for (let i = 0; i < 20; i++) expectProblem(await startSession(app, { cardNumber: "IC-CARD-999", pin: "8068" }), 401, "INVALID_CARD_OR_PIN");

            expectProblem(await startSession(app, { cardNumber: "IC-CARD-001", pin: "8068" }), 429, "RATE_LIMITED");
            expect(pinAttempts).toEqual([]);
        });
    });
});

describe("JSONの大きさの上限(100kb。L1)", () => {
    describe("境界値", () => {
        it("H26 100kbを超えるJSONは、読まずに413 PAYLOAD_TOO_LARGEをRFC 9457の形で返す(500にしない。K8)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "x".repeat(101 * 1024) });

            expectProblem(res, 413, "PAYLOAD_TOO_LARGE");
        });
    });
});
