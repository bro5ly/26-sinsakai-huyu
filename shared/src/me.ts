import { z } from "zod";
import { sessionUserSchema } from "@sinsakai/shared/auth";
import { isGuessablePin } from "@sinsakai/shared/pin";

// 本人(Web)のAPIの応答の形(docs/api.md 4.2・5章)

// GET /api/me → 200 Me。プロフィールと貸し出しの決まり。借りている物は GET /api/me/rentals で取る(2026-10-25 Me2)
export const meSchema = sessionUserSchema.extend({
    email: z.string(),
    grade: z.string().nullable(),
    major: z.string().nullable(),
    // ダッシュボードのバーコードに使う。0.8で使い捨てのバーコード(POST /api/me/tablet-codes)ができたら外す(Me1)
    cardNumber: z.string().nullable(),
    // 借りている数と延滞の有無はサーバーで数える(画面で数えない)
    borrowing: z.object({
        canBorrow: z.boolean(),
        maxItems: z.number().int(),
        suspendedUntil: z.iso.datetime().nullable(),
        activeCount: z.number().int(),
        hasOverdue: z.boolean(),
    }),
    // タブレット用のPIN。登録済みか・ロック中か(5回間違えるとロックし、Webで登録し直すまで解けない)だけを出す(2026-10-28 P3)
    pin: z.object({
        registered: z.boolean(),
        locked: z.boolean(),
    }),
});

// PUT /api/me/pin → 204。PINを変えるときはパスワードを入れ直す(P1)。推測しやすいPINは断る(P2)
export const setPinRequestSchema = z.object({
    pin: z
        .string()
        // 4桁の数字でなければ、推測しやすいかは見ない(「123」に2つの注意が出ないように)
        .regex(/^\d{4}$/, { error: "PINは4桁の数字で入力してください", abort: true })
        .refine((pin) => !isGuessablePin(pin), "同じ数字の並びや、連続した数字(1234など)は使えません"),
    password: z.string().min(1, "パスワードを入力してください"),
});

// 貸し出しの状態。DBには無く、返却期限と返却日時から決める(back/src/features/rentals/rental.status.ts)
export const rentalStateSchema = z.enum(["RENTING", "OVERDUE", "RETURNED"]);

export const rentalSchema = z.object({
    id: z.string(),
    itemType: z.object({
        id: z.string(),
        title: z.string(),
        genre: z.object({ id: z.string(), name: z.string() }),
    }),
    // 物品のバーコードは入れない。値が分かれば、実物を持たずにタブレットで返却できてしまうため(2026-10-29 BC1)
    item: z.object({ id: z.string() }),
    rentedAt: z.iso.datetime(),
    dueDate: z.iso.datetime(),
    returnedAt: z.iso.datetime().nullable(),
    state: rentalStateSchema,
});

// POST /api/tablet/rentals・POST /api/tablet/returns → 201 Rental(2026-10-29)

// GET /api/me/rentals → 200 { items: Rental[] }。今は借りている物だけ(返した物の履歴は後で。Me4)
export const myRentalsSchema = z.object({ items: z.array(rentalSchema) });

export type Me = z.infer<typeof meSchema>;
export type RentalState = z.infer<typeof rentalStateSchema>;
export type Rental = z.infer<typeof rentalSchema>;
export type MyRentals = z.infer<typeof myRentalsSchema>;
export type SetPinRequest = z.infer<typeof setPinRequestSchema>;
