// エラーのcodeと、HTTPのステータス・画面に出す文言の対応(docs/api.md 6章)。
// codeが画面との約束で、文言は変えてよい。serviceはcodeだけを知り、ステータスと文言はここだけで決める。
// サーバー(back)と画面(front)の両方がこの表を使う。画面はcodeで分岐し、文言は応答のdetailを出す(2026-10-24 P5)
export const errorCatalog = {
    VALIDATION_ERROR: { status: 400, detail: "入力内容が正しくありません" },
    INVALID_CREDENTIALS: { status: 401, detail: "学籍番号かパスワードが違います" },
    INVALID_CODE: { status: 401, detail: "認証コードが違うか、期限が切れています" },
    INVALID_TOKEN: { status: 401, detail: "手続きの期限が切れました。最初からやり直してください" },
    UNAUTHENTICATED: { status: 401, detail: "ログインしてください" },
    INVALID_SESSION: { status: 401, detail: "ログインの期限が切れました。もう一度ログインしてください" },
    DEVICE_NOT_REGISTERED: { status: 401, detail: "この端末は登録されていません" },
    INVALID_CARD_OR_PIN: { status: 401, detail: "カードかPINが違います" },
    SESSION_EXPIRED: { status: 401, detail: "時間が過ぎました。もう一度カードを読んでください" },
    FORBIDDEN: { status: 403, detail: "この操作はできません" },
    NOT_FOUND: { status: 404, detail: "見つかりません" },
    ITEM_NOT_FOUND: { status: 404, detail: "そのバーコードの物品が見つかりません" },
    ACTIVE_RENTAL_NOT_FOUND: { status: 404, detail: "この物品は貸し出されていません" },
    ALREADY_REGISTERED: { status: 409, detail: "すでに登録されています" },
    ITEM_ALREADY_RENTED: { status: 409, detail: "貸し出し中の物品です" },
    ITEM_UNAVAILABLE: { status: 409, detail: "この物品は今は貸し出せません" },
    BORROWING_SUSPENDED: { status: 409, detail: "貸し出しが止められています" },
    HAS_OVERDUE: { status: 409, detail: "返却期限を過ぎた物があります。先に返してください" },
    LIMIT_REACHED: { status: 409, detail: "借りられる数の上限です" },
    CONFLICT: { status: 409, detail: "ほかの操作とぶつかりました。もう一度やり直してください" },
    PAYLOAD_TOO_LARGE: { status: 413, detail: "送られたデータが大きすぎます" },
    PIN_LOCKED: { status: 423, detail: "PINがロックされています。Webで再設定してください" },
    RATE_LIMITED: { status: 429, detail: "回数が多すぎます。しばらくしてからやり直してください" },
    INTERNAL_ERROR: { status: 500, detail: "予期せぬエラーが発生しました" },
} as const satisfies Record<string, { status: number; detail: string }>;

export type ErrorCode = keyof typeof errorCatalog;
