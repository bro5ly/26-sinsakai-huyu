import type { ErrorCode } from "@sinsakai/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    // サーバーのcode(shared/ の表)。NO_CONTENTは画面だけで使う
    public code?: ErrorCode | "NO_CONTENT",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
