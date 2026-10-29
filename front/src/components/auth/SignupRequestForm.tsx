import { Button, Input } from "@heroui/react";

interface SignupRequestFormProps {
  studentId: string;
  loading: boolean;
  onStudentIdChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}

export const SignupRequestForm = ({
  studentId,
  loading,
  onStudentIdChange,
  onSubmit,
  onBackToLogin,
}: SignupRequestFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">New Account</h2>
        <p className="text-xs text-default-400">Request a verification code.</p>
      </div>

      <Input
        label="Student ID"
        variant="flat"
        placeholder="20240001"
        value={studentId}
        onValueChange={onStudentIdChange}
        description="A code will be sent to your registered email."
        isRequired
      />

      <Button type="submit" color="primary" className="w-full font-bold" isLoading={loading}>
        Send Code
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full text-[11px] font-bold text-default-400 hover:text-black transition-colors uppercase tracking-wider"
      >
        Back to Login
      </button>
    </form>
  );
};
