import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { route } from "./route.js";

// route() はExpressを通さずに、受け取ったreq・resで直接呼ぶ。HTTPを通した形は app.test.ts が見る
const call = async (handler: ReturnType<typeof route>, req: Partial<Request>) => {
  await handler(req as Request, {} as Response, () => undefined);
};
const body = z.object({ barcode: z.string().min(1) });

describe("route(入力を検証してから渡す)", () => {
  describe("正常系", () => {
    // 余分な項目は落とす
    it("U1 bodyのスキーマに合えば、検証した値を渡す", async () => {
      let received: unknown;
      const handler = route({ body }, async (ctx) => {
        received = ctx.body;
      });

      await call(handler, { body: { barcode: "MAC-002", extra: "x" } });

      expect(received).toEqual({ barcode: "MAC-002" });
    });

    // R6
    it("U2 auth: true なら、ミドルウェアが入れたログイン中の利用者を渡す", async () => {
      let received: unknown;
      const handler = route({ auth: true }, async (ctx) => {
        received = ctx.user;
      });

      await call(handler, { user: { id: "user-1", role: "MEMBER" } });

      expect(received).toEqual({ id: "user-1", role: "MEMBER" });
    });

    it("U3 bodyのスキーマが無ければ、bodyを見ずにそのまま呼ぶ", async () => {
      let called = false;
      const handler = route({}, async () => {
        called = true;
      });

      await call(handler, { body: undefined });

      expect(called).toBe(true);
    });
  });

  describe("異常系", () => {
    // エラー用のミドルウェアが400 VALIDATION_ERRORにする
    it("U4 bodyがスキーマに合わなければ、ZodErrorを投げて中身を呼ばない", async () => {
      let called = false;
      const handler = route({ body }, async () => {
        called = true;
      });

      await expect(call(handler, { body: { barcode: "" } })).rejects.toBeInstanceOf(z.ZodError);
      expect(called).toBe(false);
    });

    // R6
    it("U5 auth: true でログイン中の利用者がいなければ、UNAUTHENTICATEDで断り中身を呼ばない", async () => {
      let called = false;
      const handler = route({ auth: true }, async () => {
        called = true;
      });

      await expect(call(handler, {})).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      expect(called).toBe(false);
    });
  });
});
