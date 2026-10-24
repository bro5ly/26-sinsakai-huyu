import type { Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { DomainError } from "./domain-error.js";

// authMiddleware・tabletMiddleware が req.user に入れる、ログイン中の利用者
export type AuthUser = NonNullable<Request["user"]>;

type Options<S extends z.ZodType | undefined, A extends boolean> = { body?: S; auth?: A };

// auth: true のときだけ user があり、必ず入っている型にする。書き忘れて user を使うと型チェックで落ちる(2026-10-24 R6)
type Context<S extends z.ZodType | undefined, A extends boolean> = {
    body: S extends z.ZodType ? z.infer<S> : undefined;
    req: Request;
    res: Response;
} & (A extends true ? { user: AuthUser } : unknown);

// 入力の検証とログインの確認を、各routeで手で書かずにここだけで行う(docs/backlog.md 0.7 R3・R6)。
// 失敗はthrowするだけで、エラー用のミドルウェアがRFC 9457の形で返す
export const route =
    <S extends z.ZodType | undefined = undefined, A extends boolean = false>(
        options: Options<S, A>,
        handler: (ctx: Context<S, A>) => Promise<unknown>,
    ): RequestHandler =>
    async (req, res) => {
        if (options.auth && !req.user) throw new DomainError("UNAUTHENTICATED");
        const body = options.body ? options.body.parse(req.body) : undefined;
        await handler({ body, req, res, user: req.user } as Context<S, A>);
    };
