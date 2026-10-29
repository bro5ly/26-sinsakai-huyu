import { Spinner } from "@heroui/react";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = ({ message = "Loading Session..." }: LoadingSpinnerProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <Spinner size="lg" color="current" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{message}</p>
    </div>
  );
};
