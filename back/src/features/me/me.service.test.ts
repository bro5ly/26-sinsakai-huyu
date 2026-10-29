import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { MeService } from "./me.service.js";
import type { ActiveRentalRecord, MeStore, MeUserRecord } from "./me.types.js";

const now = new Date("2026-10-25T03:00:00Z");
const day = 86_400_000;

// このシステムのDB側の本人。名前などは持たない(名簿の鈴木 次郎)
const user: MeUserRecord = { id: "user-3", studentId: "20240003", role: "MEMBER", canBorrow: true, maxItems: 3, suspendedUntil: null, pin: { registered: false, locked: false } };

let passwordHash = "";
beforeAll(async () => {
    passwordHash = await bcrypt.hash("password123", 4);
});

const rental = (id: string, dueDate: Date): ActiveRentalRecord => ({
    id,
    rentedAt: new Date(dueDate.getTime() - 7 * day),
    dueDate,
    returnedAt: null,
    item: { id: `item-${id}` },
    itemType: { id: "type-1", title: "MacBook Pro 16インチ", genre: { id: "genre-1", name: "ノートパソコン" } },
});

const store = (overrides: Partial<MeStore> = {}): MeStore => ({
    findUser: async (userId) => (userId === user.id ? user : null),
    findActiveRentals: async () => [],
    findPasswordHash: async (userId) => (userId === user.id ? passwordHash : null),
    savePin: notUsed,
    ...overrides,
});

describe("getMe(本人のプロフィールと貸し出しの決まり)", () => {
    describe("正常系", () => {
        it("ME1 登録済みで名簿にいれば、名簿の名前・メール・学年・専攻と、貸し出しの決まりを返す。カードの番号は返さない(R-17。docs/api.md 5章 Me。G0)", async () => {
            const service = new MeService(store(), new FakeRoster([rosterEntry()]));

            const me = await service.getMe("user-3", now);

            expect(me).toEqual({
                id: "user-3",
                name: "鈴木 次郎",
                studentId: "20240003",
                userType: "STUDENT",
                role: "MEMBER",
                email: "suzuki@example.com",
                grade: "1年",
                major: "機械工学科",
                borrowing: { canBorrow: true, maxItems: 3, suspendedUntil: null, activeCount: 0, hasOverdue: false },
                pin: { registered: false, locked: false },
            });
        });

        it("ME6 PINの状態(登録済みか・ロック中か)を返す。PINそのものや残りの回数は返さない(P3。R-29)", async () => {
            const service = new MeService(store({ findUser: async () => ({ ...user, pin: { registered: true, locked: true } }) }), new FakeRoster([rosterEntry()]));

            const me = await service.getMe("user-3", now);

            expect(me.pin).toEqual({ registered: true, locked: true });
        });

        it("ME2 借りている数と、延滞があるかを数えて返す(画面で数えない。R-30)", async () => {
            const rentals = [rental("1", new Date(now.getTime() + day)), rental("2", new Date(now.getTime() - day))];
            const service = new MeService(store({ findActiveRentals: async () => rentals }), new FakeRoster([rosterEntry()]));

            const me = await service.getMe("user-3", now);

            expect(me.borrowing).toMatchObject({ activeCount: 2, hasOverdue: true });
        });
    });

    describe("異常系", () => {
        it("ME3 本人がDBにいなければ、断る(UNAUTHENTICATED)", async () => {
            const service = new MeService(store(), new FakeRoster([rosterEntry()]));

            await expect(service.getMe("user-x", now)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });

        it("ME4 名簿から消えていれば、登録が残っていても断る(UNAUTHENTICATED。Q13)", async () => {
            const service = new MeService(store({ findActiveRentals: notUsed }), new FakeRoster([]));

            await expect(service.getMe("user-3", now)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });
    });

    describe("境界値", () => {
        it("ME5 返却期限ちょうどの物は、まだ延滞にしない(期限を過ぎてから延滞。R-30)", async () => {
            const service = new MeService(store({ findActiveRentals: async () => [rental("1", now)] }), new FakeRoster([rosterEntry()]));

            const me = await service.getMe("user-3", now);

            expect(me.borrowing.hasOverdue).toBe(false);
        });
    });
});

describe("getMyRentals(本人が借りている物)", () => {
    describe("正常系", () => {
        it("MR1 借りている物を、返却期限から決めた状態(期限内はRENTING、過ぎたらOVERDUE)付きで返す(R-17・R-30)", async () => {
            const rentals = [rental("1", new Date(now.getTime() + day)), rental("2", new Date(now.getTime() - day))];
            const service = new MeService(store({ findActiveRentals: async () => rentals }), new FakeRoster([rosterEntry()]));

            const result = await service.getMyRentals("user-3", now);

            expect(result.map((r) => [r.id, r.state, r.itemType.genre.name])).toEqual([
                ["1", "RENTING", "ノートパソコン"],
                ["2", "OVERDUE", "ノートパソコン"],
            ]);
        });
    });

    describe("異常系", () => {
        it("MR2 本人がDBにいなければ、断る(UNAUTHENTICATED)", async () => {
            const service = new MeService(store({ findActiveRentals: notUsed }), new FakeRoster([rosterEntry()]));

            await expect(service.getMyRentals("user-x", now)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });
    });
});

describe("setPin(タブレット用のPINを登録・変更する)", () => {
    describe("正常系", () => {
        it("PS1 パスワードが合えば、PINをbcryptのハッシュにして保存する(PINそのものは保存しない。R-A5・P1)", async () => {
            const saved: { userId: string; pinHash: string }[] = [];
            const service = new MeService(store({ savePin: async (data) => void saved.push(data) }), new FakeRoster([rosterEntry()]));

            await service.setPin("user-3", { pin: "8068", password: "password123" });

            expect(saved).toHaveLength(1);
            expect(saved[0]?.userId).toBe("user-3");
            expect(saved[0]?.pinHash).not.toBe("8068");
            expect(await bcrypt.compare("8068", saved[0]?.pinHash ?? "")).toBe(true);
        });
    });

    describe("異常系", () => {
        it("PS2 入れ直したパスワードが違えば、保存せずに断る(WRONG_PASSWORD。P1・P5)", async () => {
            const service = new MeService(store({ savePin: notUsed }), new FakeRoster([rosterEntry()]));

            await expect(service.setPin("user-3", { pin: "8068", password: "wrong-password" })).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
        });

        it("PS3 本人がDBにいなければ、断る(UNAUTHENTICATED)", async () => {
            const service = new MeService(store({ savePin: notUsed }), new FakeRoster([rosterEntry()]));

            await expect(service.setPin("user-x", { pin: "8068", password: "password123" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        });
    });
});
