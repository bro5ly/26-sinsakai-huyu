import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";
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
        const response = await authService.login(studentId, password);
        if (!response.success) {
          throw new Error("Login failed");
        }

        // Get full user info with rentals
        const userInfo = await authService.getMyInfo(response.accessToken);
        setAuth(userInfo.data, response.accessToken);
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
        if (!response.success) {
          throw new Error("Invalid code");
        }
        setRegistrationToken(response.registrationToken);
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
        if (!response.success) {
          throw new Error("Signup failed");
        }

        // Get full user info with rentals
        const userInfo = await authService.getMyInfo(response.accessToken);
        setAuth(userInfo.data, response.accessToken);
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
