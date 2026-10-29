import { Button, Input } from "@heroui/react";

interface LoginFormProps {
  studentId: string;
  password: string;
  loading: boolean;
  onStudentIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToSignup: () => void;
}

export const LoginForm = ({
  studentId,
  password,
  loading,
  onStudentIdChange,
  onPasswordChange,
  onSubmit,
  onSwitchToSignup,
}: LoginFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Sign In</h2>
        <p className="text-xs text-default-400">Enter your credentials to continue.</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Student ID"
          variant="flat"
          placeholder="20240001"
          value={studentId}
          onValueChange={onStudentIdChange}
          isRequired
        />
        <Input
          label="Password"
          variant="flat"
          type="password"
          placeholder="••••••••"
          value={password}
          onValueChange={onPasswordChange}
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
          onClick={onSwitchToSignup}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
        >
          Create new account
        </button>
      </div>
    </form>
  );
};
