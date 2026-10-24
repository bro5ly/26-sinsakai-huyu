import { z } from "zod";
import { errorCatalog, type ErrorCode } from "@sinsakai/shared/error-codes";

const errorCodes = Object.keys(errorCatalog) as [ErrorCode, ...ErrorCode[]];

// 失敗の応答の形。RFC 9457 Problem Details に、画面が分岐に使うcodeと、入力の検証の項目ごとのerrorsを足した(docs/api.md 3.4)。
// サーバーはこの形で返し、画面は受け取った応答がこの形かを確かめてから使う
export const problemSchema = z.object({
    type: z.literal("about:blank"),
    title: z.string(),
    status: z.number().int(),
    code: z.enum(errorCodes),
    detail: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type Problem = z.infer<typeof problemSchema>;
