import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService, meService } from "@/services";
import { ApiError } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup-request" | "signup-verify" | "signup-password";

export const useAuthForm = () => {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        // 失敗は ApiError で来る(成功かどうかはHTTPのステータスで分かる)
        const response = await authService.login(studentId, password);

        // ログインの応答はSessionUserだけなので、本人の全体(Me)を取ってから入れる
        setAuth(await meService.getMe(response.accessToken), response.accessToken);
        setSuccess("Welcome back.");
        setTimeout(() => router.push("/dashboard"), 1000);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    [studentId, password, setAuth, router]
  );

  const handleRequestVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        await authService.requestVerification(studentId);
        setSuccess("Verification code sent.");
        setMode("signup-verify");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to send code");
      } finally {
        setLoading(false);
      }
    },
    [studentId]
  );

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        const response = await authService.verifyCode(studentId, code);
        setRegistrationToken(response.token);
        setMode("signup-password");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Invalid code");
      } finally {
        setLoading(false);
      }
    },
    [studentId, code]
  );

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        const response = await authService.signup(password, registrationToken);

        // ログインの応答はSessionUserだけなので、本人の全体(Me)を取ってから入れる
        setAuth(await meService.getMe(response.accessToken), response.accessToken);
        setSuccess("Account created.");
        setTimeout(() => router.push("/dashboard"), 1000);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Registration failed");
      } finally {
        setLoading(false);
      }
    },
    [password, registrationToken, setAuth, router]
  );

  return {
    mode,
    setMode,
    loading,
    error,
    success,
    studentId,
    setStudentId,
    password,
    setPassword,
    code,
    setCode,
    handleLogin,
    handleRequestVerification,
    handleVerifyCode,
    handleSignup,
  };
};
