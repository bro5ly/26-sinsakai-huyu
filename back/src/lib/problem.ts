import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client.js";
import { DomainError } from "./domain-error.js";
import { errorCatalog, type ErrorCode, type Problem } from "@sinsakai/shared";

const titles: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    413: "Content Too Large",
    423: "Locked",
    429: "Too Many Requests",
    500: "Internal Server Error",
};

const fromCode = (code: ErrorCode, errors?: Problem["errors"]): Problem => {
    const { status, detail } = errorCatalog[code];
    return { type: "about:blank", title: titles[status] ?? "Error", status, code, detail, ...(errors ? { errors } : {}) };
};

// express.json() が壊れたJSONを読んだときのエラー(body-parserの形)
const isBodyParseError = (err: unknown) =>
    err instanceof SyntaxError && (err as SyntaxError & { type?: string }).type === "entity.parse.failed";

// express.json() の上限(app.ts の limit)を超えたときのエラー(body-parserの形)。想定外の500にしない(2026-10-24 K8)
const isBodyTooLarge = (err: unknown) => err instanceof Error && (err as Error & { type?: string }).type === "entity.too.large";

// 想定外のエラーの中身(DBの接続先・列名など)は、応答に出さない。ログに出すのはエラー用のミドルウェアの仕事
export const toProblem = (err: unknown): Problem => {
    if (err instanceof DomainError) return fromCode(err.code);
    if (err instanceof ZodError) {
        return fromCode(
            "VALIDATION_ERROR",
            err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        );
    }
    if (isBodyParseError(err)) return fromCode("VALIDATION_ERROR");
    if (isBodyTooLarge(err)) return fromCode("PAYLOAD_TOO_LARGE");
    // Prismaの型をrepositoryの外で使う唯一の場所(エラーの境目なので。docs/backlog.md 0.7 T3の例外)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") return fromCode("CONFLICT");
        if (err.code === "P2025") return fromCode("NOT_FOUND");
    }
    return fromCode("INTERNAL_ERROR");
};
