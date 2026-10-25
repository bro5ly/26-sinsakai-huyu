import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTablet } from "./useTablet";
import { ApiError, Rental } from "@/types";

// Tablet用のRental型（features/tabletの型と互換性を持たせる）
interface TabletRental {
  id: string;
  itemTitle: string;
  barcode: string;
  borrowedAt: Date;
}

export type Step = "signin" | "action-select" | "checkout" | "return" | "complete";

export interface StepInfo {
  title: string;
  sub: string;
  color: string;
}

export interface CompletedItem {
  item: {
    itemType: {
      title: string;
    };
  };
}

export class TabletUserData {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly studentId: string,
    public readonly grade: string | null | undefined,
    public readonly major: string | null | undefined,
    public readonly rentals: TabletRental[]
  ) {}

  get displayName(): string {
    return `${this.name} (${this.studentId})`;
  }

  hasRentals(): boolean {
    return this.rentals.length > 0;
  }

  getRentalCount(): number {
    return this.rentals.length;
  }
}

export const useTabletOperations = () => {
  const {
    token: sessionToken,
    user,
    rentals,
    loading: apiLoading,
    signin,
    checkout,
    returnItem,
    signout,
  } = useTablet();

  const [step, setStep] = useState<Step>("signin");
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [completedItem, setCompletedItem] = useState<CompletedItem | null>(null);

  // タイマー制御
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert user to TabletUserData format
  const userData: TabletUserData | null = useMemo(() => {
    if (!user) return null;

    // Convert Rental[] to TabletRental[]
    const tabletRentals: TabletRental[] = (rentals || []).map(r => ({
      id: r.id,
      itemTitle: r.item?.itemType?.title || "Unknown",
      barcode: r.item?.barcode || "",
      borrowedAt: new Date(r.rentedAt),
    }));

    return new TabletUserData(
      user.id,
      user.name,
      user.studentId,
      user.grade,
      user.major,
      tabletRentals
    );
  }, [user, rentals]);

  // リセット処理
  const handleReset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStep("signin");
    signout();
    setError("");
    setSuccessMessage("");
    setCompletedItem(null);
  }, [signout]);

  // 1分間無操作でリセットするタイマー
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // signin以外のステップにいる時だけタイマーを始動
    if (step !== "signin") {
      timeoutRef.current = setTimeout(() => {
        handleReset();
      }, 60000); // 1分
    }
  }, [step, handleReset]);

  // ステップ変更時にタイマーを更新
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step, resetInactivityTimer]);

  // ステップ情報を取得
  const stepInfo: StepInfo = useMemo(() => {
    switch (step) {
      case "signin":
        return {
          title: "sign in",
          sub: "ICカードをスキャン",
          color: "text-slate-800",
        };
      case "checkout":
        return {
          title: "Checkout",
          sub: "物品バーコードをスキャン",
          color: "text-blue-600",
        };
      case "return":
        return {
          title: "Return",
          sub: "返却バーコードをスキャン",
          color: "text-emerald-500",
        };
      default:
        return { title: "", sub: "", color: "" };
    }
  }, [step]);

  // スキャン処理
  const handleScan = useCallback(
    async (barcode: string) => {
      if (apiLoading) return;

      // 操作があったのでタイマーをリセット
      resetInactivityTimer();

      setError("");

      try {
        if (step === "signin") {
          await signin(barcode);
          setStep("action-select");
        } else if (step === "checkout" && sessionToken) {
          const response = await checkout(barcode);
          setCompletedItem(response.data || null);
          setSuccessMessage("Checkout Successful");
          setStep("complete");
        } else if (step === "return" && sessionToken) {
          const response = await returnItem(barcode);
          setCompletedItem(response.data || null);
          setSuccessMessage("Return Successful");
          setStep("complete");
        }
      } catch (err) {
        if (!(err instanceof ApiError)) {
          setError("エラーが発生しました");
          return;
        }
        // 401をすべてセッション切れにすると、カードの認証の失敗まで「時間切れ」と出てしまう。
        // セッションが切れた・使えないときだけ最初の画面に戻し、文言はサーバーのdetailを出す(R-26。2026-10-24 V1-A)
        if (err.code === "SESSION_EXPIRED" || err.code === "UNAUTHENTICATED") {
          handleReset();
        }
        setError(err.message);
      }
    },
    [
      step,
      apiLoading,
      sessionToken,
      signin,
      checkout,
      returnItem,
      handleReset,
      resetInactivityTimer,
    ]
  );

  // アクション選択
  const selectCheckout = useCallback(() => {
    setStep("checkout");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const selectReturn = useCallback(() => {
    setStep("return");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const backToActionSelect = useCallback(() => {
    setStep("action-select");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  return {
    // State
    step,
    stepInfo,
    userData,
    loading: apiLoading,
    error,
    successMessage,
    completedItem,

    // Actions
    handleScan,
    handleReset,
    selectCheckout,
    selectReturn,
    backToActionSelect,
    resetInactivityTimer,
  };
};
