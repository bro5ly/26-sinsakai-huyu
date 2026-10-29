import { z } from "zod";

// カタログ(Web。ログイン必須)の応答の形(docs/api.md 4.3・5章)

const namedSchema = z.object({ id: z.string(), name: z.string() });

// GET /api/categories → 200 { items: Category[] }。絞り込みの選択肢
export const categorySchema = namedSchema.extend({ genres: z.array(namedSchema) });
export const categoriesSchema = z.object({ items: z.array(categorySchema) });

// 物品の状態。DBの値に、返却されていない貸し出しがあるときの「貸出中」を足して決める
// (back/src/features/rentals/rental.status.ts の itemAvailability。修理中などは貸出中より優先)
export const itemStateSchema = z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "LOST", "DISPOSED"]);

// GET /api/item-types → 200 { items: ItemTypeSummary[] }。種類ごと。全数に廃棄済みは入れない(2026-10-28 Ca4)
export const itemTypeSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  genre: namedSchema,
  category: namedSchema,
  imageUrl: z.string().nullable(),
  rentalPeriodDays: z.number().int(),
  availableCount: z.number().int(),
  totalCount: z.number().int(),
});
export const itemTypesSchema = z.object({ items: z.array(itemTypeSummarySchema) });

// GET /api/item-types/{id} → 200 ItemTypeDetail。物品1つ1つの状態付き。廃棄済みの物品は入れない(Ca4)
export const itemTypeDetailSchema = itemTypeSummarySchema.extend({
  description: z.string().nullable(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  isbn: z.string().nullable(),
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  items: z.array(z.object({ id: z.string(), location: z.string().nullable(), state: itemStateSchema })),
});

export type Category = z.infer<typeof categorySchema>;
export type Categories = z.infer<typeof categoriesSchema>;
export type ItemState = z.infer<typeof itemStateSchema>;
export type ItemTypeSummary = z.infer<typeof itemTypeSummarySchema>;
export type ItemTypes = z.infer<typeof itemTypesSchema>;
export type ItemTypeDetail = z.infer<typeof itemTypeDetailSchema>;
