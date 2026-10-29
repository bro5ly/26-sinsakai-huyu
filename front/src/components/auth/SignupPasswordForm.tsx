import { Button, Input } from "@heroui/react";

interface SignupPasswordFormProps {
  password: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SignupPasswordForm = ({ password, loading, onPasswordChange, onSubmit }: SignupPasswordFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Set Password</h2>
        <p className="text-xs text-default-400">Final step to secure your account.</p>
      </div>

      <Input
        label="New Password"
        variant="flat"
        type="password"
        placeholder="Min. 8 characters"
        value={password}
        onValueChange={onPasswordChange}
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
  );
};
