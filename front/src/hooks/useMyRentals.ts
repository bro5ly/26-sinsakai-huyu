import { useEffect, useState } from "react";
import type { Rental } from "@sinsakai/shared";
import { meService } from "@/services";

// ダッシュボードを開くたびに、借りている物を取り直す(ログインの状態には入れない。2026-10-25 Me2)
export const useMyRentals = (accessToken: string | null) => {
  const [rentals, setRentals] = useState<Rental[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    meService
      .getMyRentals(accessToken)
      .then((res) => {
        if (!cancelled) setRentals(res.items);
      })
      .catch(() => {
        // 取れなかったときは空のまま。ログインの切れなどはAuthContextが扱う
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return rentals;
};
