import { z } from "zod";
import { rentalStateSchema } from "@sinsakai/shared/me";

// タブレットの本人確認(docs/api.md 4.4、docs/auth.md 4.2〜4.4)

// POST /api/tablet/sessions → 201 TabletSession。カードとPINを1回で送る(カードだけでは何も分からないように。R-A12)
export const createTabletSessionRequestSchema = z.object({
    cardNumber: z.string().trim().min(1, "カードを読ませてください"),
    pin: z.string().regex(/^\d{4}$/, "PINは4桁の数字で入力してください"),
});

// 画面に出すものだけ。学籍番号・学年・専攻・利用者のID・カードの番号は入れない(R-A13)
export const tabletSessionSchema = z.object({
    // 以後のタブレットのAPIに Authorization: Bearer で付ける。画面のメモリにだけ持つ
    token: z.string(),
    // 作ってから3分。無操作30秒でも切れる(R-A9)
    expiresAt: z.iso.datetime(),
    user: z.object({ displayName: z.string() }),
    rentals: z.array(
        z.object({
            title: z.string(),
            dueDate: z.iso.datetime(),
            state: rentalStateSchema,
        }),
    ),
});

export type CreateTabletSessionRequest = z.infer<typeof createTabletSessionRequestSchema>;
export type TabletSession = z.infer<typeof tabletSessionSchema>;
