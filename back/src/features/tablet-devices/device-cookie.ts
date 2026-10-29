import type { CookieOptions } from "express";
import type { Config } from "@/config.js";

// タブレットの端末の番号を入れるCookie。付けるとき(登録・使うたび)と読むときで名前と設定をそろえる
export const DEVICE_COOKIE = "device";

// Chromeは400日より先の期限を400日に縮める(M104・2022年から)。使うたびに付け直して延ばすので、
// 毎日使う端末は切れない。止めたいときはDBで取り消す(D3)
const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60 * 1000;

export const deviceCookieOptions = (config: Config): CookieOptions => ({
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "strict",
  path: "/",
  maxAge: DEVICE_COOKIE_MAX_AGE,
});
