import { useEffect, useState } from "react";
import type { Rental } from "@sinsakai/shared";
import { meService } from "@/services";

// ダッシュボードを開くたびに、借りている物を取り直す(ログインの状態には入れない。2026-10-25 Me2)。
// enabled はログインを確かめ終えたか。確かめる前に呼ぶと401になるだけなので待つ
export const useMyRentals = (enabled: boolean) => {
  const [rentals, setRentals] = useState<Rental[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    meService
      .getMyRentals()
      .then((res) => {
        if (!cancelled) setRentals(res.items);
      })
      .catch(() => {
        // 取れなかったときは空のまま。ログインの切れなどはAuthContextが扱う
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return rentals;
};
