import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client.js";
import { DomainError } from "./domain-error.js";
import { errorCatalog, problemSchema, type ErrorCode } from "@sinsakai/shared";
import { toProblem } from "./problem.js";

// エラー → RFC 9457 の Problem Details(docs/api.md 3.4・6章)

describe("toProblem(エラーを応答の形に変える)", () => {
  describe("正常系", () => {
    it("P1 DomainErrorは、表のステータス・文言で返す", () => {
      expect(toProblem(new DomainError("ITEM_ALREADY_RENTED"))).toEqual({
        type: "about:blank",
        title: "Conflict",
        status: 409,
        code: "ITEM_ALREADY_RENTED",
        detail: "貸し出し中の物品です",
      });
    });

    it("P2 入力の検証の失敗(Zod)は、400 VALIDATION_ERRORで、項目ごとのerrorsを付ける", () => {
      const result = z
        .object({ studentId: z.string().regex(/^\d+$/, "数字のみで入力してください") })
        .safeParse({ studentId: "abc" });
      if (result.success) throw new Error("検証は失敗するはず");

      expect(toProblem(result.error)).toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
        errors: [{ path: "studentId", message: "数字のみで入力してください" }],
      });
    });

    // docs/api.md P14
    it("P3 DBの一意制約違反は、409 CONFLICTにし、DBの列名・制約名を出さない", () => {
      const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.3.0",
        meta: { target: ["student_id"] },
      });

      const problem = toProblem(err);

      expect(problem).toMatchObject({ status: 409, code: "CONFLICT" });
      expect(JSON.stringify(problem)).not.toContain("student_id");
    });

    it("P4 DBで見つからない(更新・削除の対象が無い)は、404 NOT_FOUND", () => {
      const err = new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "7.3.0",
      });

      expect(toProblem(err)).toMatchObject({ status: 404, code: "NOT_FOUND" });
    });

    // 500にしない
    it("P6 壊れたJSONが送られた(Expressの読み取りの失敗)は、400 VALIDATION_ERROR", () => {
      const err = Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed", status: 400 });

      expect(toProblem(err)).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    });

    // 500にしない。K8
    it("P8 JSONがExpressの読み取りの上限を超えたとき、413 PAYLOAD_TOO_LARGEにする", () => {
      const err = Object.assign(new Error("request entity too large"), { type: "entity.too.large", status: 413 });

      expect(toProblem(err)).toMatchObject({ status: 413, title: "Content Too Large", code: "PAYLOAD_TOO_LARGE" });
    });

    // サーバーと画面の形がずれない
    it("P9 どのcodeの応答も、画面と共有する形(shared/ の problemSchema)に合う", () => {
      for (const code of Object.keys(errorCatalog) as ErrorCode[]) {
        expect(problemSchema.safeParse(toProblem(new DomainError(code))).success).toBe(true);
      }
      const validation = toProblem(z.object({ barcode: z.string() }).safeParse({}).error);

      expect(problemSchema.parse(validation).errors).toEqual([{ path: "barcode", message: expect.any(String) }]);
    });

    it("P7 表のcodeは、どれも4xxか5xxのステータスと、空でない文言を持つ", () => {
      for (const code of Object.keys(errorCatalog) as ErrorCode[]) {
        const problem = toProblem(new DomainError(code));
        expect(problem.status, code).toBeGreaterThanOrEqual(400);
        expect(problem.title, code).not.toBe("");
        expect(problem.detail, code).not.toBe("");
      }
    });
  });

  describe("異常系", () => {
    it("P5 想定外のエラーは、500 INTERNAL_ERRORにし、中身を出さない", () => {
      const problem = toProblem(new Error("connect ECONNREFUSED db:5432 password=secret"));

      expect(problem).toMatchObject({ status: 500, code: "INTERNAL_ERROR", detail: "予期せぬエラーが発生しました" });
      expect(JSON.stringify(problem)).not.toContain("secret");
    });
  });
});
