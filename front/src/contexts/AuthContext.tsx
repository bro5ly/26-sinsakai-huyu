"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { User, RentalSetting, Rental } from "@/types";
import { authService } from "@/services";

type AuthUser = User & {
  rentalSetting?: RentalSetting | null;
  rentals?: Rental[];
};

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

  // マウント時にCookieから状態を復元し、ユーザー情報を取得
  useEffect(() => {
    const at = getATFromCookie();

    const initAuth = async () => {
      if (at) {
        setAccessToken(at);
        // ユーザー情報を取得
        try {
          const myInfo = await authService.getMyInfo(at);
          if (myInfo.success && myInfo.data) {
            console.log("✅ User info loaded:", {
              studentId: myInfo.data.studentId,
              serialNumber: myInfo.data.serialNumber,
              name: myInfo.data.name
            });
            setUser(myInfo.data);
            return; // 成功したら終了
          }
        } catch (error: any) {
          // 401エラーの場合のみリフレッシュを試みる
          if (error?.status === 401 || error?.message?.includes("401")) {
            console.log("AT expired (401), trying refresh...");
            try {
              const refreshRes = await authService.refreshSession();
              // リフレッシュの応答はSessionUserだけなので、画面が使う利用者の全体(学年・貸し出しなど)を取ってから入れる
              const retryInfo = await authService.getMyInfo(refreshRes.accessToken);
              setAuth(retryInfo.data, refreshRes.accessToken);
              return; // 成功したら終了
            } catch (refreshError) {
              console.log("RefreshSession failed, clearing auth");
              setAuth(null, null);
              return;
            }
          }
          // 401以外のエラーの場合はそのまま失敗
          console.error("Failed to get user info:", error);
          setAuth(null, null);
        }
      } else {
        // ATがない場合はリフレッシュを試みる
        try {
          const refreshRes = await authService.refreshSession();
          // リフレッシュの応答はSessionUserだけなので、画面が使う利用者の全体(学年・貸し出しなど)を取ってから入れる
          const retryInfo = await authService.getMyInfo(refreshRes.accessToken);
          setAuth(retryInfo.data, refreshRes.accessToken);
        } catch (error) {
          console.log("No AT and refresh failed");
          // リフレッシュも失敗したら何もしない（未認証状態）
          setAuth(null, null);
        }
      }
    };

    initAuth();

    // 古いATの遺産を掃除
    localStorage.removeItem("accessToken");
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      // 1. バックエンドにRT(HttpOnly Cookie)を消してもらう
      await authService.logout();
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
