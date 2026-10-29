import { z } from "zod";
import { studentIdSchema } from "@sinsakai/shared/auth";

// タブレットの端末(docs/api.md 4.4・4.5、docs/spec.md UC-20)

// POST /api/tablet-devices → 201 TabletDevice。置くタブレットの上で、管理者がその場で学籍番号とパスワードを入れる(D2)
export const registerTabletDeviceRequestSchema = z.object({
    studentId: studentIdSchema,
    password: z.string().min(1, "パスワードを入力してください"),
    // 管理者が一覧で見分けるための名前(例: 図書室入口)
    name: z.string().trim().min(1, "端末の名前を入力してください").max(50, "端末の名前は50文字までにしてください"),
});

// 端末の番号はCookieにだけ入れ、本文には入れない
export const tabletDeviceSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.iso.datetime(),
    lastUsedAt: z.iso.datetime().nullable(),
});

// GET /api/admin/tablet-devices → 200。取り消していない端末だけ
export const tabletDevicesSchema = z.object({ items: z.array(tabletDeviceSchema) });

// GET /api/tablet/device → 200。タブレットの画面が、開いたときに「登録された端末か」と名前を確かめる
export const currentTabletDeviceSchema = z.object({ id: z.string(), name: z.string() });

export type RegisterTabletDeviceRequest = z.infer<typeof registerTabletDeviceRequestSchema>;
export type TabletDevice = z.infer<typeof tabletDeviceSchema>;
export type TabletDevices = z.infer<typeof tabletDevicesSchema>;
export type CurrentTabletDevice = z.infer<typeof currentTabletDeviceSchema>;
