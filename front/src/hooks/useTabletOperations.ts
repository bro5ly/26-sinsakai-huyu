import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { TabletSession } from "@sinsakai/shared";
import { useTablet } from "./useTablet";
import { ApiError } from "@/types";

export type Step = "signin" | "pin" | "action-select" | "checkout" | "return" | "complete";

export interface StepInfo {
  title: string;
  sub: string;
  color: string;
}

// 完了の画面に出す、借りた・返した物の名前
export interface CompletedItem {
  title: string;
}

// 画面に出す本人の情報。表示用の名前と、借りている物の名前・期限・延滞だけ(学籍番号などは受け取らない。R-A13)
export interface TabletUserData {
  displayName: string;
  rentals: TabletSession["rentals"];
}

// 無操作で最初の画面に戻すまで(サーバーのセッションも30秒で切れる。R-A9)。完了の表示から自動で終えるまで(R-A10)
const INACTIVITY_MS = 30 * 1000;
const COMPLETE_MS = 10 * 1000;

// onDeviceNotRegistered: 操作の途中で端末が取り消された・登録されていないと分かったときに呼ぶ(登録の画面へ戻す)
export const useTabletOperations = (onDeviceNotRegistered?: () => void) => {
  const { session, token: sessionToken, loading: apiLoading, signin, checkout, returnItem, signout } = useTablet();

  const [step, setStep] = useState<Step>("signin");
  // 読んだカードの番号。PINと一緒に送るまで、画面のメモリにだけ持つ(カードだけでは送らない。R-A12)
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [completedItem, setCompletedItem] = useState<CompletedItem | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userData: TabletUserData | null = useMemo(
    () => (session ? { displayName: session.user.displayName, rentals: session.rentals } : null),
    [session]
  );

  // 最初の画面に戻す。サーバーのセッションも無効にする(useTablet の signout)
  const handleReset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStep("signin");
    setCardNumber(null);
    signout();
    setError("");
    setSuccessMessage("");
    setCompletedItem(null);
  }, [signout]);

  // 無操作30秒で最初の画面に戻す。完了の表示は10秒で終える
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (step !== "signin") {
      timeoutRef.current = setTimeout(handleReset, step === "complete" ? COMPLETE_MS : INACTIVITY_MS);
    }
  }, [step, handleReset]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step, resetInactivityTimer]);

  const stepInfo: StepInfo = useMemo(() => {
    switch (step) {
      case "signin":
        return { title: "sign in", sub: "カードをスキャン", color: "text-slate-800" };
      case "pin":
        return { title: "PIN", sub: "4桁のPINを入力してください", color: "text-slate-800" };
      case "checkout":
        return { title: "Checkout", sub: "物品バーコードをスキャン", color: "text-blue-600" };
      case "return":
        return { title: "Return", sub: "返却バーコードをスキャン", color: "text-emerald-500" };
      default:
        return { title: "", sub: "", color: "" };
    }
  }, [step]);

  // 失敗をまとめて扱う。セッションが切れた・端末が取り消されたら最初(か登録の画面)へ戻し、文言はサーバーのdetailを出す
  const handleError = useCallback(
    (err: unknown) => {
      if (!(err instanceof ApiError)) {
        setError("エラーが発生しました");
        return;
      }
      if (err.code === "DEVICE_NOT_REGISTERED") {
        handleReset();
        onDeviceNotRegistered?.();
        return;
      }
      // 401をすべてセッション切れにすると、カードの認証の失敗まで「時間切れ」と出てしまう。
      // セッションが切れた・使えないときと、PINがロックされたときだけ最初の画面に戻す(R-26。2026-10-24 V1-A)
      if (err.code === "SESSION_EXPIRED" || err.code === "UNAUTHENTICATED" || err.code === "PIN_LOCKED") {
        handleReset();
      }
      setError(err.message);
    },
    [handleReset, onDeviceNotRegistered]
  );

  const handleScan = useCallback(
    async (barcode: string) => {
      if (apiLoading) return;
      resetInactivityTimer();
      setError("");

      // カードを読んだら、まだ送らずにPINの入力へ進む
      if (step === "signin") {
        setCardNumber(barcode);
        setStep("pin");
        return;
      }
      try {
        if (step === "checkout" && sessionToken) {
          const rental = await checkout(barcode);
          setCompletedItem({ title: rental.itemType.title });
          setSuccessMessage("Checkout Successful");
          setStep("complete");
        } else if (step === "return") {
          // 返却はカード無しでもできる(E7)
          const rental = await returnItem(barcode);
          setCompletedItem({ title: rental.itemType.title });
          setSuccessMessage("Return Successful");
          setStep("complete");
        }
      } catch (err) {
        handleError(err);
      }
    },
    [step, apiLoading, sessionToken, checkout, returnItem, handleError, resetInactivityTimer]
  );

  // カードとPINを一緒に送る。PINが違うときは、カードを読み直さずにもう一度PINを入れられる
  const submitPin = useCallback(
    async (pin: string) => {
      if (apiLoading || !cardNumber) return;
      resetInactivityTimer();
      setError("");
      try {
        await signin(cardNumber, pin);
        setStep("action-select");
      } catch (err) {
        handleError(err);
      }
    },
    [apiLoading, cardNumber, signin, handleError, resetInactivityTimer]
  );

  const selectCheckout = useCallback(() => {
    setStep("checkout");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const selectReturn = useCallback(() => {
    setStep("return");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // 本人確認していれば操作の選択へ、カード無しで返していたなら最初の画面へ戻る
  const backToActionSelect = useCallback(() => {
    if (!sessionToken) {
      handleReset();
      return;
    }
    setStep("action-select");
    resetInactivityTimer();
  }, [sessionToken, handleReset, resetInactivityTimer]);

  return {
    step,
    stepInfo,
    userData,
    loading: apiLoading,
    error,
    successMessage,
    completedItem,
    handleScan,
    submitPin,
    handleReset,
    selectCheckout,
    selectReturn,
    backToActionSelect,
    resetInactivityTimer,
  };
};
