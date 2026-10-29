import type { RequestHandler } from "express";
import { DomainError } from "@/lib/domain-error.js";

// 管理者だけのAPI(/api/admin の下)の入口に、Webのセッションの確かめの後で1回だけ付ける。
// 1か所に付けるので、管理者のAPIを足すときに確かめを書き忘れない(2026-10-29 D1)
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  next();
};
