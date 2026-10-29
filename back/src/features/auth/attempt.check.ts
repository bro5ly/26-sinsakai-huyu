// 総当たりの対策のうち、DBの回数で数える分の判断(docs/auth.md 4.6、docs/backlog.md 0.8 F1・F4)。
// 接続元・学籍番号・端末ごとにメモリで数える分は lib/rate-limit.ts

// Webのログイン: 学籍番号ごとに、続けて5回間違えたら15分止める(F1)
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
// 認証コード: 1つのコードで5回間違えたら、そのコードを無効にする(R-8・Q1)
export const CODE_MAX_ATTEMPTS = 5;

// 止めている間は、パスワードを比べずに断る(正しいパスワードでも通さない。bcryptを回さずに済む)
export const isLoginLocked = (lockedUntil: Date | null, now: Date): boolean => lockedUntil !== null && now < lockedUntil;

export type LoginAttemptResult =
    | { ok: true; failedAttempts: 0; lockedUntil: null }
    | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED"; failedAttempts: number; lockedUntil: Date | null };

// 5回目の間違いで止め、その応答から「回数が多すぎます」にする(待てばよいと分かるように。PINのE5と同じ考え)。
// 止めたら回数は0に戻す(15分たったら、また5回試せる)
export const afterLoginAttempt = (failedAttempts: number, matched: boolean, now: Date): LoginAttemptResult => {
    if (matched) return { ok: true, failedAttempts: 0, lockedUntil: null };
    const next = failedAttempts + 1;
    return next >= LOGIN_MAX_ATTEMPTS
        ? { ok: false, reason: "RATE_LIMITED", failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) }
        : { ok: false, reason: "INVALID_CREDENTIALS", failedAttempts: next, lockedUntil: null };
};

export type CodeAttemptResult =
    | { ok: true }
    // none: 何も書かない(無い・期限切れ・使用済み)。count: 間違えた回数を書く。invalidate: 行ごと消す
    | { ok: false; action: "none" }
    | { ok: false; action: "count"; attempts: number }
    | { ok: false; action: "invalidate" };

// 断るときの応答は、どれも同じ INVALID_CODE(何が悪かったかを言わない)。何回目かも言わない
export const afterCodeAttempt = (
    record: { expiresAt: Date; tokenHash: string | null; attempts: number } | null,
    matched: boolean,
    now: Date,
): CodeAttemptResult => {
    if (!record || now >= record.expiresAt || record.tokenHash !== null) return { ok: false, action: "none" };
    if (record.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, action: "invalidate" };
    if (matched) return { ok: true };
    const next = record.attempts + 1;
    return next >= CODE_MAX_ATTEMPTS ? { ok: false, action: "invalidate" } : { ok: false, action: "count", attempts: next };
};
