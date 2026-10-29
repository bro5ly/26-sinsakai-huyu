import type { TabletDeviceRecord } from "./tablet-device.types.js";

export type DeviceCheck = { ok: true; device: TabletDeviceRecord } | { ok: false; reason: "DEVICE_NOT_REGISTERED" };

// タブレットのAPIを、この端末から使ってよいか。無い端末と取り消した端末は、同じ理由で断る(R-A2・R-A3)
export const checkDevice = (device: TabletDeviceRecord | null): DeviceCheck => {
  if (!device || device.revokedAt) return { ok: false, reason: "DEVICE_NOT_REGISTERED" };
  return { ok: true, device };
};
