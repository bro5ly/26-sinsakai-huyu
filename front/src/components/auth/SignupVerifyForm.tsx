import { Button, Input } from "@heroui/react";

interface SignupVerifyFormProps {
  code: string;
  loading: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SignupVerifyForm = ({
  code,
  loading,
  onCodeChange,
  onSubmit,
}: SignupVerifyFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
        onValueChange={onCodeChange}
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
  );
};
