import bcrypt from "bcrypt";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeRoster, notUsed, rosterEntry } from "@/test/fake-roster.js";
import { cryptoSecrets, hashToken } from "@/lib/session-token.js";
import { bcryptPasswords } from "@/lib/password.js";
import type { Roster } from "@/features/roster/roster.js";
import type { NewSession, SessionRecord, SessionStore } from "@/features/auth/auth.types.js";
import type { RentalRecord } from "@/features/rentals/rental.types.js";
import { TabletSessionService } from "./tablet-session.service.js";
import type { ActiveRentalReader, CardHolderRecord, CardHolderStore, PinAttempt } from "./tablet-session.types.js";

const now = new Date("2026-10-29T03:00:00Z");
const day = 86_400_000;
const suzuki = rosterEntry(); // 鈴木 次郎・20240003・IC-CARD-003

let pinHash = "";
beforeAll(async () => {
  pinHash = await bcrypt.hash("8068", 4);
});

const holder = (overrides: Partial<CardHolderRecord> = {}): CardHolderRecord => ({
  id: "user-3",
  role: "MEMBER",
  isActive: true,
  pinHash,
  pinFailedAttempts: 0,
  pinLockedAt: null,
  ...overrides,
});

type Attempt = PinAttempt;
const holders = (record: CardHolderRecord | null, attempts: Attempt[] = []): CardHolderStore => ({
  findCardHolderByStudentId: async (studentId) => (studentId === "20240003" ? record : null),
  savePinAttempt: async (data) => void attempts.push(data),
});

type CreatedSession = NewSession;
const sessions = (overrides: Partial<SessionStore> = {}, created: CreatedSession[] = []): SessionStore => ({
  createSession: async (data) => void created.push(data),
  findSessionByTokenHash: notUsed,
  saveSessionLastUsedAt: notUsed,
  deleteSessionByTokenHash: notUsed,
  ...overrides,
});

const rental = (dueDate: Date): RentalRecord => ({
  id: "rental-1",
  rentedAt: new Date(dueDate.getTime() - 7 * day),
  dueDate,
  returnedAt: null,
  item: { id: "item-1" },
  itemType: { id: "type-1", title: "MacBook Pro", genre: { id: "genre-1", name: "ノートパソコン" } },
});
const rentals = (items: RentalRecord[] = []): ActiveRentalReader => ({
  findActiveRentalsByUserId: async () => items,
});

// 本物のbcryptと乱数を使う(PINのハッシュは beforeAll で作る)
const sessionService = (
  roster: Roster,
  cardHolders: CardHolderStore,
  sessions: SessionStore,
  rentals: ActiveRentalReader,
) =>
  new TabletSessionService({
    roster,
    cardHolders,
    sessions,
    rentals,
    passwords: bcryptPasswords,
    secrets: cryptoSecrets,
  });

const start = (service: TabletSessionService, pin = "8068", cardNumber = "IC-CARD-003") =>
  service.start({ cardNumber, pin, deviceId: "device-1" }, now);

describe("start(カードとPINでタブレットのセッションを作る)", () => {
  describe("正常系", () => {
    it("T6 カードとPINが合えば、その端末でだけ使える3分のセッションを作り、番号はハッシュだけをDBに置く(R-A8)", async () => {
      const created: CreatedSession[] = [];
      const service = sessionService(new FakeRoster([suzuki]), holders(holder()), sessions({}, created), rentals());

      const result = await start(service);

      expect(created).toEqual([
        {
          tokenHash: hashToken(result.token),
          userId: "user-3",
          kind: "TABLET",
          expiresAt: new Date(now.getTime() + 3 * 60_000),
          deviceId: "device-1",
        },
      ]);
      expect(result.expiresAt).toEqual(new Date(now.getTime() + 3 * 60_000));
    });

    it("T6 応答は、表示用の名前と、借りている物の名前・期限・延滞だけ(学籍番号・学年・専攻・ID・カードの番号は返さない。R-A13)", async () => {
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder()),
        sessions(),
        rentals([rental(new Date(now.getTime() - day))]),
      );

      const result = await start(service);

      expect(result).toEqual({
        token: expect.any(String),
        expiresAt: expect.any(Date),
        displayName: "鈴木 次郎",
        rentals: [{ title: "MacBook Pro", dueDate: new Date(now.getTime() - day), state: "OVERDUE" }],
      });
    });

    it("T6 前に間違えていた回数があれば、0に戻す", async () => {
      const attempts: Attempt[] = [];
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder({ pinFailedAttempts: 2 }), attempts),
        sessions(),
        rentals(),
      );

      await start(service);

      expect(attempts).toEqual([{ userId: "user-3", failedAttempts: 0, lockedAt: null }]);
    });
  });

  describe("異常系", () => {
    it("T2 名簿に無いカードなら、INVALID_CARD_OR_PIN で、セッションを作らない", async () => {
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder()),
        sessions({ createSession: notUsed }),
        rentals(),
      );

      await expect(start(service, "8068", "IC-CARD-999")).rejects.toMatchObject({ code: "INVALID_CARD_OR_PIN" });
    });

    it("T3 PINを登録していなければ、INVALID_CARD_OR_PIN(A-Q3)", async () => {
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder({ pinHash: null })),
        sessions({ createSession: notUsed }),
        rentals(),
      );

      await expect(start(service)).rejects.toMatchObject({ code: "INVALID_CARD_OR_PIN" });
    });

    it("T4 ロック中なら、PINが合っていても PIN_LOCKED", async () => {
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder({ pinLockedAt: now })),
        sessions({ createSession: notUsed }),
        rentals(),
      );

      await expect(start(service)).rejects.toMatchObject({ code: "PIN_LOCKED" });
    });

    it("T5 PINが違えば、間違えた回数を1つ足して INVALID_CARD_OR_PIN", async () => {
      const attempts: Attempt[] = [];
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder({ pinFailedAttempts: 1 }), attempts),
        sessions({ createSession: notUsed }),
        rentals(),
      );

      await expect(start(service, "1357")).rejects.toMatchObject({ code: "INVALID_CARD_OR_PIN" });
      expect(attempts).toEqual([{ userId: "user-3", failedAttempts: 2, lockedAt: null }]);
    });
  });

  describe("境界値", () => {
    it("T5 5回目の間違いでロックを保存し、PIN_LOCKED(R-A7・E5)", async () => {
      const attempts: Attempt[] = [];
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder({ pinFailedAttempts: 4 }), attempts),
        sessions({ createSession: notUsed }),
        rentals(),
      );

      await expect(start(service, "1357")).rejects.toMatchObject({ code: "PIN_LOCKED" });
      expect(attempts).toEqual([{ userId: "user-3", failedAttempts: 5, lockedAt: now }]);
    });
  });
});

const tabletSession = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  kind: "TABLET",
  expiresAt: new Date(now.getTime() + 60_000),
  createdAt: new Date(now.getTime() - 60_000),
  deviceId: "device-1",
  lastUsedAt: new Date(now.getTime() - 5_000),
  user: { id: "user-3", role: "MEMBER", isActive: true },
  ...overrides,
});

describe("authenticate・end(タブレットのセッションを確かめる・終える)", () => {
  describe("正常系", () => {
    it("TA1 通るセッションなら利用者を返し、最後に使った日時を書き換える(無操作30秒を数え直す。R-A9)", async () => {
      const touched: [string, Date][] = [];
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder()),
        sessions({
          findSessionByTokenHash: async (hash) => (hash === hashToken("t-1") ? tabletSession() : null),
          saveSessionLastUsedAt: async (hash, at) => void touched.push([hash, at]),
        }),
        rentals(),
      );

      expect(await service.authenticate({ token: "t-1", deviceId: "device-1" }, now)).toEqual({
        id: "user-3",
        role: "MEMBER",
      });
      expect(touched).toEqual([[hashToken("t-1"), now]]);
    });

    it("TA2 終えると、DBのセッションを消す(「終わる」・完了の10秒。R-A10)", async () => {
      const deleted: string[] = [];
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder()),
        sessions({ deleteSessionByTokenHash: async (hash) => void deleted.push(hash) }),
        rentals(),
      );

      await service.end("t-1");

      expect(deleted).toEqual([hashToken("t-1")]);
    });
  });

  describe("異常系", () => {
    it("TA3 番号が無ければ、DBを見ずに UNAUTHENTICATED", async () => {
      const service = sessionService(new FakeRoster([suzuki]), holders(holder()), sessions(), rentals());

      await expect(service.authenticate({ token: undefined, deviceId: "device-1" }, now)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    });

    it("TA4 時間切れなら SESSION_EXPIRED で、最後に使った日時は書き換えない", async () => {
      const service = sessionService(
        new FakeRoster([suzuki]),
        holders(holder()),
        sessions({
          findSessionByTokenHash: async () => tabletSession({ lastUsedAt: new Date(now.getTime() - 31_000) }),
        }),
        rentals(),
      );

      await expect(service.authenticate({ token: "t-1", deviceId: "device-1" }, now)).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });
  });
});
