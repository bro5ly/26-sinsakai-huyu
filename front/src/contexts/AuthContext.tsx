"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Me } from "@sinsakai/shared";
import { authService, meService } from "@/services";

// 確かめ中(loading)を「ログインしていない」と分ける。分けないと、再読み込みの直後に
// ログインの画面へ送ってしまう(2026-10-28 Ca6〜Ca8、A8-4)
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// ログインの状態として持つのは本人(Me)だけ。借りている物は使う画面がその都度取る(2026-10-25 Me2)。
// セッションの番号はHttpOnlyのCookieにあり、画面からは読めない(A8-3)。だから持たない
interface AuthContextType {
  status: AuthStatus;
  user: Me | null;
  // ログイン・登録のあとに呼ぶ。Cookieのセッションで本人を取り直す
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<Me | null>(null);

  const loadMe = useCallback(async () => {
    try {
      setUser(await meService.getMe());
      setStatus("authenticated");
    } catch {
      // 401(セッションが無い・切れた)のほか、APIに届かないときもログインしていない扱いにする
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  // 開いたときに1回だけ、Cookieのセッションが生きているかを /api/me で確かめる
  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // サーバーが失敗しても、画面はログアウトした状態にする
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  return <AuthContext.Provider value={{ status, user, loadMe, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
