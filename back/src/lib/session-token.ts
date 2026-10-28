import { createHash, randomBytes } from "node:crypto";

// セッション・登録用トークン・端末の番号に共通で使う(docs/auth.md 2章、A8-5)。
// 32バイトの乱数は推測できないので、パスワードと違い、遅いハッシュ(bcrypt)でなくてよい
export const newToken = (): string => randomBytes(32).toString("base64url");

// DBには番号そのものではなく、これだけを置く(DBが漏れても、そのままは使えない)
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
