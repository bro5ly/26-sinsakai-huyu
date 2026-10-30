import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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

// 画面に出す本人の情報。表示用の名前だけ(借りている物・学籍番号などは受け取らない。R-A13・2026-10-30 A2)
export interface TabletUserData {
  displayName: string;
}

// 無操作で最初の画面に戻すまで。サーバーのセッションは、最後にサーバーへ送ってから30秒で切れる(R-A9)。
// 画面のボタン(「借りる」を選ぶなど)はサーバーに送らないので、押したときに画面だけ延ばすと、操作中なのにサーバーでは
// 時間切れになる。本人確認したあとは、サーバーに送って通ったときから数える(2026-10-30 A1)。完了の表示は10秒で終える(R-A10)
const INACTIVITY_MS = 30 * 1000;
const COMPLETE_MS = 10 * 1000;
// サーバーのセッションが切れた・使えないことを表す code。この応答では、サーバーの時計は延びていない
const SESSION_ENDED_CODES = new Set(["SESSION_EXPIRED", "UNAUTHENTICATED", "DEVICE_NOT_REGISTERED"]);

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
  // 本人確認したセッションで、最後にサーバーへ送って通った時刻(サーバーが無操作30秒を数え直した時刻)
  const lastServerTouchRef = useRef<number | null>(null);

  const userData: TabletUserData | null = useMemo(
    () => (session ? { displayName: session.user.displayName } : null),
    [session],
  );

  // 最初の画面に戻す。サーバーのセッションも無効にする(useTablet の signout)
  const handleReset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lastServerTouchRef.current = null;
    setStep("signin");
    setCardNumber(null);
    signout();
    setError("");
    setSuccessMessage("");
    setCompletedItem(null);
  }, [signout]);

  // 今の段の残り時間で、最初の画面に戻す時計をかけ直す。本人確認の前(PIN・カード無しの返却)は、その段に入ってから30秒。
  // 本人確認のあとは、サーバーの時計と同じ「最後にサーバーへ送ってから30秒」。完了の表示は、そのうえで10秒まで
  const armResetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (step === "signin") return;
    const touchedAt = lastServerTouchRef.current;
    const sessionLeft = touchedAt === null ? INACTIVITY_MS : touchedAt + INACTIVITY_MS - Date.now();
    const left = step === "complete" ? Math.min(COMPLETE_MS, sessionLeft) : sessionLeft;
    timeoutRef.current = setTimeout(handleReset, Math.max(0, left));
  }, [step, handleReset]);

  // サーバーに送って通ったとき(サーバーが無操作30秒を数え直したとき)に呼ぶ
  const touchServer = useCallback(() => {
    lastServerTouchRef.current = Date.now();
    armResetTimer();
  }, [armResetTimer]);

  useEffect(() => {
    armResetTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step, armResetTimer]);

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
    [handleReset, onDeviceNotRegistered],
  );

  const handleScan = useCallback(
    async (barcode: string) => {
      if (apiLoading) return;
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
          touchServer();
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
        // 貸し出しで断られても(延滞など)、セッションは通っているので、サーバーの時計は延びている
        if (step === "checkout" && err instanceof ApiError && !SESSION_ENDED_CODES.has(err.code ?? "")) touchServer();
        handleError(err);
      }
    },
    [step, apiLoading, sessionToken, checkout, returnItem, handleError, touchServer],
  );

  // カードとPINを一緒に送る。PINが違うときは、カードを読み直さずにもう一度PINを入れられる
  const submitPin = useCallback(
    async (pin: string) => {
      if (apiLoading || !cardNumber) return;
      setError("");
      try {
        await signin(cardNumber, pin);
        touchServer();
        setStep("action-select");
      } catch (err) {
        // PINを入れ直す間は、また30秒待つ(まだサーバーのセッションは無い)
        armResetTimer();
        handleError(err);
      }
    },
    [apiLoading, cardNumber, signin, handleError, touchServer, armResetTimer],
  );

  // 選ぶだけではサーバーに送らないので、時計は延ばさない(A1)
  const selectCheckout = useCallback(() => setStep("checkout"), []);

  const selectReturn = useCallback(() => setStep("return"), []);

  // 本人確認していれば操作の選択へ、カード無しで返していたなら最初の画面へ戻る
  const backToActionSelect = useCallback(() => {
    if (!sessionToken) {
      handleReset();
      return;
    }
    setStep("action-select");
  }, [sessionToken, handleReset]);

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
  };
};
