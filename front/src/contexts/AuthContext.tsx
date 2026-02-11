"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { AuthUser } from "@/lib/auth-api";
import { authApi } from "@/lib/auth-api";

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser | null, token: string | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Cookie操作のヘルパー
 */
const getATFromCookie = () => {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1] || null
  );
};

const setATCookie = (token: string | null) => {
  if (typeof document === "undefined") return;
  if (token) {
    // 1時間で期限切れにする設定 (バックエンドのAT寿命に合わせる)
    document.cookie = `accessToken=${token}; path=/; max-age=3600; SameSite=Lax`;
  } else {
    // トークンがnullならCookieを削除
    document.cookie = `accessToken=; path=/; max-age=0;`;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // マウント時にCookieから状態を復元 (※user情報は必要に応じてAPIで再取得が望ましい)
  useEffect(() => {
    const at = getATFromCookie();
    const storedUser = localStorage.getItem("user"); // ユーザー名表示用などの非機密情報なら保持もアリ

    if (at) {
      setAccessToken(at);
      if (storedUser) setUser(JSON.parse(storedUser));
    }

    // 古いATの遺産を掃除
    localStorage.removeItem("accessToken");
  }, []);

  const setAuth = useCallback(
    (newUser: AuthUser | null, token: string | null) => {
      setUser(newUser);
      setAccessToken(token);
      setATCookie(token);

      if (newUser) {
        localStorage.setItem("user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("user");
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // 1. バックエンドにRT(HttpOnly Cookie)を消してもらう
      await authApi.logout();
    } catch (error) {
      console.error("Failed to logout from server:", error);
    } finally {
      // 2. サーバー側が失敗しても、フロントエンド側は必ずクリアする
      setAuth(null, null);
      // ※ router.push('/auth') は利用側のコンポーネントで行うのが一般的
    }
  }, [setAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        setAuth,
        logout,
        isAuthenticated: !!accessToken, // ATの有無で判定
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
