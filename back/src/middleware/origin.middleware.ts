import type { RequestHandler } from "express";
import { DomainError } from "@/lib/domain-error.js";

// 読むだけのリクエストは、ほかのサイトから送られても何も変わらないので見ない
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRFの対策(docs/auth.md 2章、A8-7・A8-11)。セッションはCookieで自動で送られるので、
// 書き換えのリクエストは、画面のURLから送られたもの(Originをブラウザが付け、JSでは偽れない)だけを通す。
// Originが無いときも通さない(OWASPは「無い」を同じサイトの証拠にしないとしている)
export const createOriginCheck =
  (frontendUrl: string): RequestHandler =>
  (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.get("origin") !== frontendUrl) throw new DomainError("FORBIDDEN_ORIGIN");
    next();
  };
