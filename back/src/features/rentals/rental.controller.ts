import type { RentalService } from "./rental.service.js";
import type { Request,Response } from "express";
import { rentalSchema } from './rental.schema.js'
import { handleError, sendSuccess } from "@/lib/response-handler.js";
import { AppError } from "@/lib/error.js";

export class RentalController {
    constructor( private rentalService: RentalService){}
    
    signinByIc = async (req: Request, res: Response) => {
        try {
            const { serialNumber } = rentalSchema.signin.parse(req.body)
            const result = await this.rentalService.signInWithIc(serialNumber)
            return sendSuccess(res,result,200)
        } catch (err) {
            return handleError(res,err)
        }
    }

    checkoutItem = async (req: Request, res: Response) => {
        try {
            const { barcode } = rentalSchema.itemAction.parse(req.body)
            const userId = req.user?.id
            if(!userId) throw new AppError('ユーザーidが見つかりません',404,'USER_ID_NOT_FOUND')
            const result = await this.rentalService.checkoutItem(userId,barcode)
            return sendSuccess(res,result,200)
        } catch (err) {
            return handleError(res,err)
        }
    }

    returnItem = async (req: Request, res: Response) => {
        try {
            const { barcode } = rentalSchema.itemAction.parse(req.body)
            const result = await this.rentalService.returnItem(barcode)
            return sendSuccess(res,result,200)
        } catch (err) {
            return handleError(res,err)
        }
    }
}