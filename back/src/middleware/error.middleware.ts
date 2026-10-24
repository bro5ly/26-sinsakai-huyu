import type { ErrorRequestHandler, RequestHandler } from "express";
import { DomainError } from "@/lib/domain-error.js";
import { toProblem } from "@/lib/problem.js";

// どのrouteにも当てはまらないURL。HTMLではなく、ほかのエラーと同じ形で返す
export const notFoundHandler: RequestHandler = () => {
    throw new DomainError("NOT_FOUND");
};

// エラーを返すのはここだけ(docs/backlog.md 0.7 E1〜E3)。Express 5は、asyncの処理のthrowもここに渡す
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const problem = toProblem(err);
    if (problem.status >= 500) {
        // 想定外のエラーは、種類とスタックだけを出す。リクエストの中身(学籍番号・パスワードなど)は出さない(E3)
        console.error("[INTERNAL_ERROR]", err instanceof Error ? (err.stack ?? err.name) : typeof err);
    }
    res.status(problem.status).type("application/problem+json").json(problem);
};
