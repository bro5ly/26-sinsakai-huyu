"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/auth-api";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Input, Card, CardBody, Divider, Spinner } from "@heroui/react";

type Mode = "login" | "signup-request" | "signup-verify" | "signup-password";

export default function AuthPage() {
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

  // 共通の処理（ロジック部分は変更なし）
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authApi.login(studentId, password);
      document.cookie = `accessToken=${response.accessToken}; path=/; max-age=3600; SameSite=Lax`;
      setAuth(response.user, response.accessToken);
      setSuccess("Welcome back.");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authApi.requestVerification(studentId);
      setRegistrationToken(response.registrationToken);
      setSuccess("Verification code sent.");
      setMode("signup-verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authApi.verifyCode(studentId, code);
      setRegistrationToken(response.registrationToken);
      setMode("signup-password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authApi.signup(password, registrationToken);
      document.cookie = `accessToken=${response.accessToken}; path=/; max-age=3600; SameSite=Lax`;

      setAuth(response.user, response.accessToken);
      setSuccess("Account created.");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50" />

      <div className="w-full max-w-[400px] z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-xl">
            M
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">
            貸し出し管理
          </h1>
          <p className="text-[10px] font-bold text-default-400 tracking-[0.3em] uppercase mt-1">
            Institutional Access
          </p>
        </div>

        <Card
          className="border-none bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-200/50"
          radius="lg"
        >
          <CardBody className="p-8">
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-3 bg-danger-50 text-danger text-[11px] font-bold rounded-lg border border-danger-100 text-center animate-appearance-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-3 bg-success-50 text-success text-[11px] font-bold rounded-lg border border-success-100 text-center animate-appearance-in">
                {success}
              </div>
            )}

            {/* Login Mode */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Sign In</h2>
                  <p className="text-xs text-default-400">
                    Enter your credentials to continue.
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Student ID"
                    variant="flat"
                    placeholder="S2024001"
                    value={studentId}
                    onValueChange={setStudentId}
                    isRequired
                  />
                  <Input
                    label="Password"
                    variant="flat"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onValueChange={setPassword}
                    isRequired
                  />
                </div>

                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-bold shadow-lg shadow-blue-500/30"
                  isLoading={loading}
                >
                  Sign In
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setMode("signup-request")}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                  >
                    Create new account
                  </button>
                </div>
              </form>
            )}

            {/* Signup Request Mode */}
            {mode === "signup-request" && (
              <form onSubmit={handleRequestVerification} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">New Account</h2>
                  <p className="text-xs text-default-400">
                    Request a verification code.
                  </p>
                </div>

                <Input
                  label="Student ID"
                  variant="flat"
                  placeholder="S2024001"
                  value={studentId}
                  onValueChange={setStudentId}
                  description="A code will be sent to your registered email."
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-bold"
                  isLoading={loading}
                >
                  Send Code
                </Button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full text-[11px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-wider"
                >
                  Back to Login
                </button>
              </form>
            )}

            {/* Signup Verify Mode */}
            {mode === "signup-verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-1 text-center">
                  <h2 className="text-lg font-bold">Security Check</h2>
                  <p className="text-xs text-default-400">
                    Enter the 6-digit code we sent you.
                  </p>
                </div>

                <Input
                  variant="flat"
                  className="text-center"
                  classNames={{
                    input: "text-2xl font-black tracking-[0.5em] text-center",
                  }}
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onValueChange={setCode}
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-bold"
                  isLoading={loading}
                >
                  Verify Code
                </Button>
              </form>
            )}

            {/* Signup Password Mode */}
            {mode === "signup-password" && (
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Set Password</h2>
                  <p className="text-xs text-default-400">
                    Final step to secure your account.
                  </p>
                </div>

                <Input
                  label="New Password"
                  variant="flat"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onValueChange={setPassword}
                  minLength={8}
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-bold shadow-lg shadow-blue-500/30"
                  isLoading={loading}
                >
                  Complete Registration
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Footer Links */}
        <div className="mt-12 flex items-center justify-center gap-6">
          <a
            href="/tablet"
            className="text-[10px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-[0.2em]"
          >
            Tablet View
          </a>
          <div className="w-1 h-1 bg-default-200 rounded-full" />
          <a
            href="/barcodes"
            className="text-[10px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-[0.2em]"
          >
            Barcodes
          </a>
        </div>
      </div>
    </div>
  );
}
