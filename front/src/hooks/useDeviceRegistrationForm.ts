import { useCallback, useState } from "react";
import { registerTabletDeviceRequestSchema } from "@sinsakai/shared";
import { tabletService } from "@/services";
import { ApiError } from "@/types";

// タブレットの上で、管理者が学籍番号・パスワード・端末の名前を入れて登録する(UC-20)。
// Webのログインはしない(公共の場のタブレットに管理者のログインを残さない。D2)
export const useDeviceRegistrationForm = (onRegistered: () => Promise<void> | void) => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    const parsed = registerTabletDeviceRequestSchema.safeParse({ studentId, password, name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容が正しくありません");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await tabletService.registerDevice(parsed.data);
      // パスワードを画面に残さない
      setPassword("");
      await onRegistered();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登録できませんでした");
    } finally {
      setLoading(false);
    }
  }, [studentId, password, name, onRegistered]);

  return { studentId, setStudentId, password, setPassword, name, setName, error, loading, submit };
};
