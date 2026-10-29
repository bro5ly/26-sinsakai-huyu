import { useCallback, useState } from "react";
import { setPinRequestSchema } from "@sinsakai/shared";
import { meService } from "@/services";
import { ApiError } from "@/types";

// PINの登録・変更の入力と送信。送る前に、サーバーと同じ決まり(4桁の数字・推測しやすいPINは使えない。P2)で確かめ、
// その場で理由を出す。サーバーでも同じ決まりで確かめている
export const usePinForm = (onSaved: () => Promise<void> | void) => {
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setPin("");
    setPassword("");
    setError("");
  }, []);

  const submit = useCallback(async () => {
    const parsed = setPinRequestSchema.safeParse({ pin, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容が正しくありません");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await meService.setPin(parsed.data);
      reset();
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "PINを保存できませんでした");
    } finally {
      setLoading(false);
    }
  }, [pin, password, reset, onSaved]);

  return { pin, setPin, password, setPassword, error, loading, submit, reset };
};
