"use client";

import { AuthLayout, LoginForm, SignupRequestForm, SignupVerifyForm, SignupPasswordForm } from "@/components";
import { useAuthForm } from "@/hooks/useAuthForm";

export default function AuthPage() {
  const {
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
  } = useAuthForm();

  return (
    <AuthLayout error={error} success={success}>
      {mode === "login" && (
        <LoginForm
          studentId={studentId}
          password={password}
          loading={loading}
          onStudentIdChange={setStudentId}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
          onSwitchToSignup={() => setMode("signup-request")}
        />
      )}

      {mode === "signup-request" && (
        <SignupRequestForm
          studentId={studentId}
          loading={loading}
          onStudentIdChange={setStudentId}
          onSubmit={handleRequestVerification}
          onBackToLogin={() => setMode("login")}
        />
      )}

      {mode === "signup-verify" && (
        <SignupVerifyForm code={code} loading={loading} onCodeChange={setCode} onSubmit={handleVerifyCode} />
      )}

      {mode === "signup-password" && (
        <SignupPasswordForm
          password={password}
          loading={loading}
          onPasswordChange={setPassword}
          onSubmit={handleSignup}
        />
      )}
    </AuthLayout>
  );
}
