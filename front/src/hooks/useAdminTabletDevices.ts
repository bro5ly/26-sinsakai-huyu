import { useCallback, useEffect, useState } from "react";
import type { TabletDevice } from "@sinsakai/shared";
import { adminService } from "@/services";
import { ApiError } from "@/types";

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : "読み込みに失敗しました");

// 管理者が端末の一覧を見て、取り消す(UC-20・R-A3)。enabled は、管理者としてログインしていると確かめ終えたか
export const useAdminTabletDevices = (enabled: boolean) => {
  const [devices, setDevices] = useState<TabletDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 取り消したあとに一覧を取り直すための合図
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    adminService
      .listTabletDevices()
      .then((res) => {
        if (cancelled) return;
        setDevices(res.items);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, version]);

  const revoke = useCallback(async (id: string) => {
    try {
      await adminService.revokeTabletDevice(id);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(messageOf(err));
    }
  }, []);

  return { devices, error, loading: devices === null && error === null, revoke };
};
