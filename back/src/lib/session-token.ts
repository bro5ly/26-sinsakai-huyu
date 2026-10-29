import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// セッション・登録用トークン・端末の番号に共通で使う(docs/auth.md 2章、A8-5)。
// 32バイトの乱数は推測できないので、パスワードと違い、遅いハッシュ(bcrypt)でなくてよい
export const newToken = (): string => randomBytes(32).toString("base64url");

// 認証コード(6桁の数字。R-4)。Math.randomは推測されうるので、暗号用の乱数で作る。人が打つので短く、そのぶん回数で守る(docs/auth.md 4.6)
export const newCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");

// DBには番号そのものではなく、これだけを置く(DBが漏れても、そのままは使えない)
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

// hashToken()どうしを比べる。比べ終わるまでの時間で、どこまで合っていたかを知られないようにする(docs/auth.md 4.6)
export const sameHash = (a: string, b: string): boolean => {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
};
