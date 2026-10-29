import { describe, expect, it } from "vitest";
import { checkDevice } from "./device.check.js";
import type { TabletDeviceRecord } from "./tablet-device.types.js";

const device = (overrides: Partial<TabletDeviceRecord> = {}): TabletDeviceRecord => ({
  id: "device-1",
  name: "図書室入口",
  createdAt: new Date("2026-10-29T00:00:00Z"),
  lastUsedAt: null,
  revokedAt: null,
  ...overrides,
});

// タブレットのAPIを、この端末から使ってよいか(docs/auth.md R-A2・R-A3、判断表T1)
describe("checkDevice(登録された端末か)", () => {
  describe("正常系", () => {
    it("DV1 登録されていて取り消していなければ、通す", () => {
      expect(checkDevice(device())).toEqual({ ok: true, device: device() });
    });
  });

  describe("異常系", () => {
    it("DV2 端末が無ければ(Cookieが無い・でたらめな番号)、断る(DEVICE_NOT_REGISTERED。R-A2・T1)", () => {
      expect(checkDevice(null)).toEqual({ ok: false, reason: "DEVICE_NOT_REGISTERED" });
    });

    it("DV3 取り消した端末なら、断る(DEVICE_NOT_REGISTERED。R-A3)", () => {
      expect(checkDevice(device({ revokedAt: new Date("2026-10-29T01:00:00Z") }))).toEqual({
        ok: false,
        reason: "DEVICE_NOT_REGISTERED",
      });
    });
  });
});
