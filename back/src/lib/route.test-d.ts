import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { DomainError } from "./domain-error.js";
import { route, type AuthUser } from "./route.js";

// 型だけを確かめる(vitest --typecheck が tsc で調べ、中身は走らせない)。
// route() は、ログインの確認の書き忘れと、検証していない入力を読むのを型で止めている(docs/backlog.md 0.7 R3・R6)
const body = z.object({ barcode: z.string() });

describe("route(型)", () => {
  describe("正常系", () => {
    it("U6 auth: true のとき、user は必ずある", () => {
      route({ auth: true }, async (ctx) => {
        expectTypeOf(ctx.user).toEqualTypeOf<AuthUser>();
      });
    });

    it("U7 body のスキーマを渡したとき、body はスキーマから作った型になる", () => {
      route({ body }, async (ctx) => {
        expectTypeOf(ctx.body).toEqualTypeOf<{ barcode: string }>();
      });
    });
  });

  describe("異常系", () => {
    it("U8 auth を付けないとき、user は無い(書き忘れて使うと型チェックで落ちる)", () => {
      route({}, async (ctx) => {
        expectTypeOf(ctx).not.toHaveProperty("user");
      });
    });

    it("U9 body のスキーマを渡さないとき、body は undefined", () => {
      route({ auth: true }, async (ctx) => {
        expectTypeOf(ctx.body).toEqualTypeOf<undefined>();
      });
    });
  });
});

describe("DomainError(型)", () => {
  describe("異常系", () => {
    it("U10 shared の表に無い code は渡せない", () => {
      // @ts-expect-error 表(shared/src/error-codes.ts)に無い code
      expectTypeOf(new DomainError("NO_SUCH_CODE")).toEqualTypeOf<DomainError>();
    });
  });
});
