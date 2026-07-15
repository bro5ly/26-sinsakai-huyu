import z from 'zod'

export const rentalSchema = {
    // ICカードのシリアル用
    signin: z.object({
        serialNumber: z.string().min(1, "シリアル番号は必須です")
    }),
    // 貸出・返却のバーコード用
    itemAction: z.object({
        barcode: z.string().min(1, "バーコードは必須です")
    })
}