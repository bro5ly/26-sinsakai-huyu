import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";
import { User, ApiError, MyInfoResponse } from "@/types";
import { useCookie } from "./useCookie";

export const useAuthData = () => {
  const router = useRouter();
  const { getCookie, setCookie, removeCookie } = useCookie();
  const [myInfo, setMyInfo] = useState<MyInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadData = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const myInfoData = await authService.getMyInfo(token);
        setMyInfo(myInfoData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            const refreshRes = await authService.refreshSession();
            setCookie("accessToken", refreshRes.accessToken);
            setAccessToken(refreshRes.accessToken);
            const retryInfo = await authService.getMyInfo(
              refreshRes.accessToken
            );
            setMyInfo(retryInfo);
          } catch {
            await handleLogout();
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [setCookie]
  );

  const handleLogout = useCallback(async () => {
    await authService.logout();
    removeCookie("accessToken");
    setAccessToken(null);
    setMyInfo(null);
    router.push("/auth");
  }, [removeCookie, router]);

  useEffect(() => {
    const at = accessToken || getCookie("accessToken");
    if (!at) {
      const silentRefresh = async () => {
        try {
          const res = await authService.refreshSession();
          setCookie("accessToken", res.accessToken);
          setAccessToken(res.accessToken);
          loadData(res.accessToken);
        } catch {
          router.push("/auth");
        }
      };
      silentRefresh();
    } else {
      loadData(at);
    }
    // Clean up localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
  }, [accessToken, loadData, router, setCookie, getCookie]);

  return { myInfo, loading, accessToken, handleLogout, refetchData: loadData };
};
