import type { RentalService } from "./rental.service.js";
import type { Request,Response } from "express";
import { rentalSchema } from './rental.schema.js'
import { sendSuccess } from "@/lib/response-handler.js";
import { DomainError } from "@/lib/domain-error.js";

// 失敗は throw するだけでよい(Express 5が middleware/error.middleware.ts に渡す)
export class RentalController {
    constructor( private rentalService: RentalService){}

    signinByIc = async (req: Request, res: Response) => {
        const { serialNumber } = rentalSchema.signin.parse(req.body)
        const result = await this.rentalService.signInWithIc(serialNumber)
        return sendSuccess(res,result,200)
    }

    checkoutItem = async (req: Request, res: Response) => {
        const { barcode } = rentalSchema.itemAction.parse(req.body)
        const userId = req.user?.id
        if(!userId) throw new DomainError('UNAUTHENTICATED')
        const result = await this.rentalService.checkoutItem(userId,barcode)
        return sendSuccess(res,result,200)
    }

    returnItem = async (req: Request, res: Response) => {
        const { barcode } = rentalSchema.itemAction.parse(req.body)
        const result = await this.rentalService.returnItem(barcode)
        return sendSuccess(res,result,200)
    }
}
