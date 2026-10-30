import { useState, useCallback } from "react";
import type { TabletSession } from "@sinsakai/shared";
import { tabletService } from "@/services";
import { ApiError } from "@/types";

// タブレットで本人確認した人のセッション(docs/auth.md R-A8〜A13)。番号は画面のメモリにだけ持ち、再読み込みで消える
export const useTablet = () => {
  const [session, setSession] = useState<TabletSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = useCallback(async (cardNumber: string, pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tabletService.startSession({ cardNumber, pin });
      setSession(response);
      return response;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "認証に失敗しました");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkout = useCallback(
    async (barcode: string) => {
      if (!session) throw new Error("認証されていません");
      setLoading(true);
      setError(null);
      try {
        return await tabletService.rentItem(barcode, session.token);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "貸出に失敗しました");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  // 返却はカードもPINも要らない(返すのは本人でなくてよい。A-Q4・E7)ので、セッションが無くても呼べる
  const returnItem = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      return await tabletService.returnItem(barcode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "返却に失敗しました");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 画面を最初に戻すときは、サーバーのセッションも無効にする(立ち去った人の名前で次の人が借りられないように。R-A10)。
  // すでに切れていても気にしない
  const signout = useCallback(() => {
    if (session) void tabletService.endSession(session.token).catch(() => undefined);
    setSession(null);
    setError(null);
  }, [session]);

  return { session, token: session?.token ?? null, loading, error, signin, checkout, returnItem, signout };
};
