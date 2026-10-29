import { useCallback, useEffect, useState } from "react";
import type { CurrentTabletDevice } from "@sinsakai/shared";
import { tabletService } from "@/services";

// このタブレットが、貸し出しを受け付ける端末として登録されているか(docs/auth.md R-A1・R-A2)。
// 確かめている間(loading)は、登録の画面も受付の画面も出さない
export type TabletDeviceStatus = "loading" | "registered" | "unregistered";

export const useTabletDevice = () => {
  const [status, setStatus] = useState<TabletDeviceStatus>("loading");
  const [device, setDevice] = useState<CurrentTabletDevice | null>(null);
  // 登録が済んだあとに確かめ直すための合図
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    tabletService
      .getDevice()
      .then((current) => {
        if (cancelled) return;
        setDevice(current);
        setStatus("registered");
      })
      .catch(() => {
        // 登録されていない・取り消されたほか、APIに届かないときも登録の画面を出す(登録しようとすれば、理由が出る)
        if (cancelled) return;
        setDevice(null);
        setStatus("unregistered");
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const check = useCallback(() => setVersion((v) => v + 1), []);

  // 操作の途中で端末が取り消されたとき(DEVICE_NOT_REGISTERED)に、登録の画面へ戻す
  const markUnregistered = useCallback(() => {
    setDevice(null);
    setStatus("unregistered");
  }, []);

  return { status, device, check, markUnregistered };
};
