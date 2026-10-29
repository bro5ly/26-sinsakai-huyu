import type { ErrorCode } from "@sinsakai/shared";

// 業務の決まりで断るときにserviceが投げる。持つのはcodeだけで、HTTPのステータスと文言は知らない
// (変えるのはエラー用のミドルウェア。docs/backlog.md 0.7 E1・E2)
export class DomainError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = "DomainError";
  }
}
