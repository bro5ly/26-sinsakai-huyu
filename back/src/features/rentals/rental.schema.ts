import z from "zod";

export const rentalSchema = {
  // 貸出・返却のバーコード用
  itemAction: z.object({
    barcode: z.string().min(1, "バーコードは必須です"),
  }),
};
