import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import * as jwtLib from "@/lib/jwt.js";
import type { Deps } from "@/deps.js";
import { loadConfig } from "@/config.js";
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
const registered = () => ({ id: "user-1", studentId: "20240001", passwordHash, role: "MEMBER" as const });

const item = { id: "item-2", barcode: "MAC-002", name: "MacBook 2", status: "AVAILABLE", itemType: { title: "MacBook", rentalPeriodDays: 7 } };
const rental = { id: "rental-1", itemId: "item-2", userId: "user-1", rentedAt: new Date("2026-10-24T00:00:00Z"), dueDate: new Date("2099-01-01T00:00:00Z"), returnedAt: null };

// 設定はテストの中で決める。鍵は lib/jwt.ts が .env から読むものと同じにする(トークンを作って渡すテストがあるため)
const testConfig = loadConfig({ DATABASE_URL: "unused", JWT_ACCESS_SECRET: process.env["JWT_ACCESS_SECRET"], JWT_REFRESH_SECRET: process.env["JWT_REFRESH_SECRET"] });

// 本物と同じ形の部品を偽物で作る。テストごとに一部だけ差し替える
const fakeDeps = (overrides: Partial<Deps> = {}) => {
    const sentMails: { to: string; code: string }[] = [];
    const savedRefreshTokens: string[] = [];
    const deps: Deps = {
        users: {
            create: async ({ studentId }) => ({ ...registered(), id: "user-new", studentId }),
            findById: async (id) => (id === "user-1" ? registered() : null),
            findByStudentId: async (studentId) => (studentId === "20240001" ? registered() : null),
        },
        auth: {
            saveRefreshToken: async ({ refreshToken }) => {
                savedRefreshTokens.push(refreshToken);
                return undefined as never;
            },
            findRefreshToken: async (token) => (savedRefreshTokens.includes(token) ? ({ expiresAt: new Date("2099-01-01") } as never) : null),
            saveTmpCode: async () => undefined as never,
            checkTmpCode: async () => ({ code: "123456", expiresAt: new Date("2099-01-01") }) as never,
            deleteTmpCode: async () => undefined as never,
        },
        mailer: {
            sendCode: async (to, code) => {
                sentMails.push({ to, code });
                return undefined as never;
            },
        },
        roster: new FakeRoster([yamada, newcomer]),
        items: {
            findAll: async () => [{ ...item, rentals: [] }] as never,
            getMyInfo: async (userId) =>
                (userId === "user-1"
                    ? { id: "user-1", studentId: "20240001", isActive: true, canBorrow: true, maxItems: 3, suspendedUntil: null, suspensionReason: null, rentals: [] }
                    : null) as never,
        },
        rentals: {
            findUserWithActiveRentals: async (studentId) => (studentId === "20240001" ? ({ id: "user-1", studentId, rentals: [] } as never) : null),
            findByBarcode: async (barcode) => (barcode === item.barcode ? (item as never) : null),
            saveCheckout: async () => rental as never,
            saveReturned: async () => ({ ...rental, returnedAt: new Date("2026-10-25T00:00:00Z") }) as never,
        },
        ...overrides,
    };
    return { app: createApp(deps, testConfig), sentMails, savedRefreshTokens };
};

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const accessToken = () => jwtLib.signAccessToken({ sub: "user-1", role: "MEMBER" });
const tabletToken = () => jwtLib.signTabletToken({ sub: "user-1", role: "TABLET_USER" });
const refreshCookieOf = (res: request.Response) => ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("refreshToken="));

const expectProblem = (res: request.Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({ status, code });
};

describe("POST /api/auth/login(ログイン)", () => {
    describe("正常系", () => {
        it("現状: H1 学籍番号とパスワードが合えば、200で利用者とアクセストークンを返し、リフレッシュトークンはHttpOnlyのCookieにだけ入れる(R-11)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/login").send({ studentId: "20240001", plainPassword: "password123" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                success: true,
                accessToken: expect.any(String),
                user: { id: "user-1", studentId: "20240001", name: "山田 太郎", userType: "STUDENT", grade: "2年", major: "情報工学科", serialNumber: "IC-CARD-001" },
            });
            const cookie = refreshCookieOf(res);
            expect(cookie).toMatch(/HttpOnly/);
            expect(cookie).toMatch(/SameSite=Strict/);
            expect(cookie).toMatch(/Path=\//);
        });
    });

    describe("異常系", () => {
        it("H2 パスワードが違えば、401 INVALID_CREDENTIALSをRFC 9457の形で返す(R-16)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/login").send({ studentId: "20240001", plainPassword: "wrong-password" });

            expectProblem(res, 401, "INVALID_CREDENTIALS");
            expect(refreshCookieOf(res)).toBeUndefined();
        });

        it("H3 入力が足りなければ、400 VALIDATION_ERRORで、足りない項目をerrorsに入れる", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/login").send({});

            expectProblem(res, 400, "VALIDATION_ERROR");
            expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual(["plainPassword", "studentId"]);
        });
    });
});

describe("登録(認証コードの申請 → 確認 → パスワードを決める)", () => {
    describe("正常系", () => {
        it("現状: H4 名簿にいて未登録なら、200 CODE_SENTを返し、名簿のメールに6桁のコードを送る(R-4)", async () => {
            const { app, sentMails } = fakeDeps();

            const res = await request(app).post("/api/auth/request-verification").send({ studentId: "20260001" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: "CODE_SENT" });
            expect(sentMails).toEqual([{ to: "taro@example.com", code: expect.stringMatching(/^\d{6}$/) }]);
        });

        it("現状: H5 認証コードが合えば、200で登録用トークンを返す(R-6)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/verify-code").send({ studentId: "20260001", code: "123456" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: "VerificationSuccess", registrationToken: expect.any(String) });
        });

        it("現状: H6 登録用トークンでパスワードを決めれば、200で利用者を返し、リフレッシュトークンをCookieに入れる(R-9)", async () => {
            const { app } = fakeDeps();
            const registrationToken = jwtLib.signRegistrationToken({ studentId: "20260001" });

            const res = await request(app).post("/api/auth/signup").send({ plainPassword: "password123", registrationToken });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ success: true, accessToken: expect.any(String), user: { id: "user-new", studentId: "20260001", name: "テスト 太郎" } });
            expect(res.body.refreshToken).toBeUndefined();
            expect(refreshCookieOf(res)).toMatch(/HttpOnly/);
        });
    });
});

describe("セッション(リフレッシュ・ログアウト)", () => {
    describe("正常系", () => {
        it("現状: H7 ログインのCookieでリフレッシュすれば、200で新しいアクセストークンを返し、Cookieを入れ替える(R-13・R-14)", async () => {
            const { app } = fakeDeps();
            const agent = request.agent(app);
            await agent.post("/api/auth/login").send({ studentId: "20240001", plainPassword: "password123" });

            const res = await agent.post("/api/auth/refreshSession");

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ success: true, accessToken: expect.any(String), user: { id: "user-1" } });
            expect(refreshCookieOf(res)).toMatch(/HttpOnly/);
        });

        it("現状: H8 ログアウトすれば、200を返し、リフレッシュトークンのCookieを消す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/logout");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: "Logged out successfully" });
            expect(refreshCookieOf(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
        });
    });

    describe("異常系", () => {
        it("H9 Cookieが無ければ、401 INVALID_SESSIONを返す(500にしない)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/auth/refreshSession");

            expectProblem(res, 401, "INVALID_SESSION");
        });
    });
});

describe("GET /api/items(物品の一覧)", () => {
    describe("正常系", () => {
        it("現状: H10 ログインしていなくても、200で状態付きの物品をdataに入れて返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: [{ ...item, status: "AVAILABLE" }] });
        });
    });
});

describe("GET /api/items/me(自分の情報)", () => {
    describe("正常系", () => {
        it("現状: H11 アクセストークンがあれば、200で名簿の項目と貸し出しの決まりをdataに入れて返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items/me").set(bearer(accessToken()));

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                data: { id: "user-1", studentId: "20240001", name: "山田 太郎", serialNumber: "IC-CARD-001", rentalSetting: { canBorrow: true, maxItems: 3 }, rentals: [] },
            });
        });
    });

    describe("異常系", () => {
        it("H12 アクセストークンが無ければ、401 UNAUTHENTICATEDを返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items/me");

            expectProblem(res, 401, "UNAUTHENTICATED");
        });

        it("H13 タブレット用でもアクセストークンでもない壊れたトークンなら、401 UNAUTHENTICATEDを返す(500にしない)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items/me").set(bearer("broken"));

            expectProblem(res, 401, "UNAUTHENTICATED");
        });
    });
});

describe("POST /api/tablet/signin(カードで本人確認)", () => {
    describe("正常系", () => {
        it("現状: H14 名簿にあり登録済みのカードなら、200でタブレット用トークンと利用者と借りている物を返す(R-17)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/tablet/signin").send({ serialNumber: "IC-CARD-001" });

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

            const res = await request(app).post("/api/tablet/signin").send({ serialNumber: "IC-CARD-999" });

            expectProblem(res, 401, "INVALID_CARD_OR_PIN");
        });
    });
});

describe("POST /api/tablet/checkout(貸し出し)", () => {
    describe("正常系", () => {
        it("現状: H16 タブレット用トークンがあれば、200で状態付きの貸し出しを返す(R-19)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/tablet/checkout").set(bearer(tabletToken())).send({ barcode: "MAC-002" });

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

            const res = await request(app).post("/api/tablet/checkout").send({ barcode: "MAC-002" });

            expectProblem(res, 401, "UNAUTHENTICATED");
        });

        it("H18 バーコードの物品が無ければ、404 ITEM_NOT_FOUNDを返す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/tablet/checkout").set(bearer(tabletToken())).send({ barcode: "NOPE-001" });

            expectProblem(res, 404, "ITEM_NOT_FOUND");
        });
    });
});

describe("POST /api/tablet/return(返却)", () => {
    describe("正常系", () => {
        it("現状: H19 タブレット用トークンがあれば、200で返却済みの状態付きの貸し出しを返す(R-21)", async () => {
            const { app } = fakeDeps();

            const res = await request(app).post("/api/tablet/return").set(bearer(tabletToken())).send({ barcode: "MAC-002" });

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

            const res = await request(app).get("/api/items");

            expect(res.headers["x-content-type-options"]).toBe("nosniff");
            expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
            expect(res.headers["x-powered-by"]).toBeUndefined();
        });

        it("H22 helmetを付けても、画面(FRONTEND_URL)からのCORSとCookieは今のまま通す", async () => {
            const { app } = fakeDeps();

            const res = await request(app).get("/api/items").set("Origin", "http://localhost:4545");

            expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:4545");
            expect(res.headers["access-control-allow-credentials"]).toBe("true");
        });
    });
});

describe("ログインの回数の制限(接続元ごとに15分で20回。docs/auth.md 4.6・C5)", () => {
    const login = (app: ReturnType<typeof fakeDeps>["app"]) =>
        request(app).post("/api/auth/login").send({ studentId: "20240001", plainPassword: "wrong-password" });

    describe("正常系", () => {
        it("H23 20回目までは、制限せずにいつもどおり答える", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 19; i++) await login(app);

            const res = await login(app);

            expectProblem(res, 401, "INVALID_CREDENTIALS");
        });

        it("H24 ログインのほかのAPI(登録の申請など)は、制限しない", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 20; i++) await login(app);

            const res = await request(app).post("/api/auth/request-verification").send({ studentId: "20260001" });

            expect(res.status).toBe(200);
        });
    });

    describe("境界値", () => {
        it("H25 21回目は、パスワードを確かめずに429 RATE_LIMITEDをRFC 9457の形で返す", async () => {
            const { app } = fakeDeps();
            for (let i = 0; i < 20; i++) await login(app);

            const res = await request(app).post("/api/auth/login").send({ studentId: "20240001", plainPassword: "password123" });

            expectProblem(res, 429, "RATE_LIMITED");
        });
    });
});
