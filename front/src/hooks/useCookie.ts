import { useCallback } from "react";

export const useCookie = () => {
  const getCookie = useCallback((name: string): string | undefined => {
    if (typeof document === "undefined") return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return undefined;
  }, []);

  const setCookie = useCallback((name: string, value: string | null, maxAge: number = 3600) => {
    if (typeof document === "undefined") return;
    if (value) {
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } else {
      document.cookie = `${name}=; path=/; max-age=0;`;
    }
  }, []);

  const removeCookie = useCallback(
    (name: string) => {
      setCookie(name, null, 0);
    },
    [setCookie],
  );

  return { getCookie, setCookie, removeCookie };
};
