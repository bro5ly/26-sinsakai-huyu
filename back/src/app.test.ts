import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import * as jwtLib from "@/lib/jwt.js";
import { hashToken } from "@/lib/session-token.js";
import type { SessionRecord } from "@/features/auth/session.check.js";
import type { Deps } from "@/deps.js";
import { loadConfig } from "@/config.js";
import { categoriesSchema, itemTypeDetailSchema, itemTypesSchema, meSchema, myRentalsSchema, sessionSchema, verificationTokenSchema } from "@sinsakai/shared";
import { createApp } from "./app.js";

// HTTPを通して、URL・ステータス・応答の形・Cookieを守るテスト(docs/backlog.md 0.7 C1の②)。
// 判断の細かい場合分けは各serviceのテストにあるので、ここは「つながっているか」と「形」だけを見る。
// 名前に「現状:」が付いたものは、docs/api.md の形に移すときに変わると決まっている今の形({ success: true, ...data } など)
let passwordHash = "";
beforeAll(async () => {
    passwordHash = await bcrypt.hash("password123", 4);
});

const yamada = rosterEntry({ studentId: "20240001", name: "山田 太郎", email: "yamada@example.com", serialNumber: "IC-CARD-001", grade: "2年", major: "情報工学科" });
const newcomer = rosterEntry({ studentId: "20260001", name: "テスト 太郎", email: "taro@example.com", serialNumber: "SN-001" });
const registered = () => ({ id: "user-1", studentId: "20240001", passwordHash, role: "MEMBER" as const, isActive: true });

const item = { id: "item-2", barcode: "MAC-002", name: "MacBook 2", status: "AVAILABLE", itemType: { title: "MacBook", rentalPeriodDays: 7 } };
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
const rental = { id: "rental-1", itemId: "item-2", userId: "user-1", rentedAt: new Date("2026-10-24T00:00:00Z"), dueDate: new Date("2099-01-01T00:00:00Z"), returnedAt: null };

// 設定はテストの中で決める。鍵は lib/jwt.ts が .env から読むものと同じにする(タブレットのトークンを作って渡すテストがあるため)
const testConfig = loadConfig({ DATABASE_URL: "unused", JWT_ACCESS_SECRET: process.env["JWT_ACCESS_SECRET"] });
const frontendUrl = testConfig.frontendUrl;

// はじめからDBにあるセッション。Webのログイン中・期限切れ・タブレット用(Webでは通らない)
const WEB_TOKEN = "web-token-1";
const EXPIRED_TOKEN = "expired-token-1";
const TABLET_KIND_TOKEN = "tablet-kind-token-1";
const REGISTRATION_TOKEN = "registration-token-1";
const member = { id: "user-1", role: "MEMBER" as const, isActive: true };
const initialSessions = (): Map<string, SessionRecord> =>
    new Map([
        [hashToken(WEB_TOKEN), { kind: "WEB", expiresAt: new Date("2099-01-01"), user: member }],
        [hashToken(EXPIRED_TOKEN), { kind: "WEB", expiresAt: new Date("2000-01-01"), user: member }],
        [hashToken(TABLET_KIND_TOKEN), { kind: "TABLET", expiresAt: new Date("2099-01-01"), user: member }],
    ]);

// 本物と同じ形の部品を偽物で作る。テストごとに一部だけ差し替える
const fakeDeps = (overrides: Partial<Deps> = {}) => {
    const sentMails: { to: string; code: string }[] = [];
    const sessions = initialSessions();
    const deletedSessionHashes: string[] = [];
    const deps: Deps = {
        users: {
            create: async ({ studentId }) => ({ ...registered(), id: "user-new", studentId }),
            findById: async (id) => (id === "user-1" ? registered() : null),
            findByStudentId: async (studentId) => (studentId === "20240001" ? registered() : null),
        },
        auth: {
            saveTmpCode: async () => undefined as never,
            checkTmpCode: async () => ({ code: "123456", expiresAt: new Date("2099-01-01"), tokenHash: null }) as never,
            deleteTmpCode: async () => undefined as never,
            saveRegistrationToken: async () => undefined,
            findByRegistrationTokenHash: async (hash) => (hash === hashToken(REGISTRATION_TOKEN) ? { studentId: "20260001", tokenExpiresAt: new Date("2099-01-01") } : null),
        },
        sessions: {
            create: async ({ tokenHash, userId, kind, expiresAt }) => {
                sessions.set(tokenHash, { kind, expiresAt, user: { ...member, id: userId } });
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
        roster: new FakeRoster([yamada, newcomer]),
        catalog: {
            findCategories: async () => [{ id: "cat-1", name: "電子機器", genres: [{ id: "genre-1", name: "ノートパソコン" }] }],
            findItemTypes: async () => [macbookType],
            findItemType: async (id) => (id === macbookType.id ? macbookType : null),
        },
        me: {
            findUser: async (userId) =>
                userId === "user-1" ? { id: "user-1", studentId: "20240001", role: "MEMBER", canBorrow: true, maxItems: 3, suspendedUntil: null } : null,
            findActiveRentals: async () => [
                {
                    id: "rental-1",
                    rentedAt: rental.rentedAt,
                    dueDate: rental.dueDate,
                    returnedAt: null,
                    item: { id: "item-2", barcode: "MAC-002" },
                    itemType: { id: "type-1", title: "MacBook", genre: { id: "genre-1", name: "ノートパソコン" } },
                },
            ],
        },
        rentals: {
            findUserWithActiveRentals: async (studentId) => (studentId === "20240001" ? ({ id: "user-1", studentId, rentals: [] } as never) : null),
            findByBarcode: async (barcode) => (barcode === item.barcode ? (item as never) : null),
            saveCheckout: async () => rental as never,
            saveReturned: async () => ({ ...rental, returnedAt: new Date("2026-10-25T00:00:00Z") }) as never,
        },
        ...overrides,
    };
    return { app: createApp(deps, testConfig), sentMails, deletedSessionHashes };
};

type App = ReturnType<typeof fakeDeps>["app"];
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const tabletToken = () => jwtLib.signTabletToken({ sub: "user-1", role: "TABLET_USER" });
const sessionCookie = (token: string) => ({ Cookie: `session=${token}` });
const webSession = sessionCookie(WEB_TOKEN);
const sessionCookieOf = (res: request.Response) => ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("session="));
// 書き換えのリクエストは、画面のURLのOriginが無いと断られる(A8-7)。ブラウザと同じく付けて送る
const post = (app: App, url: string) => request(app).post(url).set("Origin", frontendUrl);

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

            expectProblem(await request(app).get("/api/me").set(bearer(tabletToken())), 401, "UNAUTHENTICATED");
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
            const { app } = fakeDeps({ sessions: { create: notUsed, findByTokenHash: notUsed, deleteByTokenHash: notUsed } });

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
        it("H11 Webのセッションがあれば、GET /api/meは200でMeの形(名簿の項目・カードの番号・貸し出しの決まり)を返す(docs/api.md 4.2。Me1)", async () => {
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
                cardNumber: "IC-CARD-001",
                borrowing: { canBorrow: true, maxItems: 3, suspendedUntil: null, activeCount: 1, hasOverdue: false },
            });
            expect(res.body).not.toHaveProperty("success");
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
                        item: { id: "item-2", barcode: "MAC-002" },
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

describe("POST /api/tablet/signin(カードで本人確認)", () => {
    describe("正常系", () => {
        it("現状: H14 名簿にあり登録済みのカードなら、200でタブレット用トークンと利用者と借りている物を返す(R-17)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/tablet/signin").send({ serialNumber: "IC-CARD-001" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                success: true,
                message: "認証に成功しました",
                session: expect.any(String),
                user: { id: "user-1", studentId: "20240001", name: "山田 太郎", grade: "2年", major: "情報工学科" },
                data: [],
            });
        });
    });

    describe("異常系", () => {
        it("H15 名簿に無いカードなら、401 INVALID_CARD_OR_PINを返す", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/tablet/signin").send({ serialNumber: "IC-CARD-999" });

            expectProblem(res, 401, "INVALID_CARD_OR_PIN");
        });
    });
});

describe("POST /api/tablet/checkout(貸し出し)", () => {
    describe("正常系", () => {
        it("現状: H16 タブレット用トークンがあれば、200で状態付きの貸し出しを返す(R-19)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/tablet/checkout").set(bearer(tabletToken())).send({ barcode: "MAC-002" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                success: true,
                message: "貸し出しが完了しました",
                data: { ...rental, rentedAt: rental.rentedAt.toISOString(), dueDate: rental.dueDate.toISOString(), status: "RENTING" },
            });
        });
    });

    describe("異常系", () => {
        it("H17 タブレット用トークンが無ければ、401 UNAUTHENTICATEDを返し、貸し出さない", async () => {
            // DBに触れたらテストが落ちるようにして、ミドルウェアで止まることを見る
            const { app } = fakeDeps({ rentals: { findUserWithActiveRentals: notUsed, findByBarcode: notUsed, saveCheckout: notUsed, saveReturned: notUsed } });

            const res = await post(app, "/api/tablet/checkout").send({ barcode: "MAC-002" });

            expectProblem(res, 401, "UNAUTHENTICATED");
        });

        it("H18 バーコードの物品が無ければ、404 ITEM_NOT_FOUNDを返す", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/tablet/checkout").set(bearer(tabletToken())).send({ barcode: "NOPE-001" });

            expectProblem(res, 404, "ITEM_NOT_FOUND");
        });
    });
});

describe("POST /api/tablet/return(返却)", () => {
    describe("正常系", () => {
        it("現状: H19 タブレット用トークンがあれば、200で返却済みの状態付きの貸し出しを返す(R-21)", async () => {
            const { app } = fakeDeps();

            const res = await post(app, "/api/tablet/return").set(bearer(tabletToken())).send({ barcode: "MAC-002" });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ success: true, message: "返却が完了しました", data: { id: "rental-1", returnedAt: "2026-10-25T00:00:00.000Z", status: "RETURNED" } });
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

describe("ログインの回数の制限(接続元ごとに、失敗を15分で20回まで。docs/auth.md 4.6・C5・K9-B)", () => {
    const login = (app: ReturnType<typeof fakeDeps>["app"]) =>
        post(app, "/api/sessions").send({ studentId: "20240001", password: "wrong-password" });

    describe("正常系", () => {
        it("H23 20回目までは、制限せずにいつもどおり答える", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 19; i++) await login(app);

            const res = await login(app);

            expectProblem(res, 401, "INVALID_CREDENTIALS");
        });

        it("H27 成功したログインは数えない。同じWi-Fiの大勢が続けてログインしても止めない(2026-10-24 K9-B)", async () => {
            const { app } = fakeDeps();
            const success = () => post(app, "/api/sessions").send({ studentId: "20240001", password: "password123" });
            for (let i = 0; i < 25; i++) await success();
            for (let i = 0; i < 19; i++) await login(app);

            const res = await success();

            expect(res.status).toBe(201);
        });

        it("H24 ログインのほかのAPI(登録の申請など)は、制限しない", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 20; i++) await login(app);

            const res = await post(app, "/api/verification-codes").send({ studentId: "20260001", purpose: "signup" });

            expect(res.status).toBe(202);
        });
    });

    describe("境界値", () => {
        it("H25 21回目は、パスワードを確かめずに429 RATE_LIMITEDをRFC 9457の形で返す", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 20; i++) await login(app);

            const res = await post(app, "/api/sessions").send({ studentId: "20240001", password: "password123" });

            expectProblem(res, 429, "RATE_LIMITED");
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
