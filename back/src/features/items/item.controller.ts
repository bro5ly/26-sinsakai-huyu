import type { ItemService } from "./item.service.js";
import type { Request, Response } from "express"

export class ItemController {
    constructor(private itemService: ItemService) { }

    //一覧取得のアクション
    getItems = async (req: Request, res: Response) => {

        const items = await this.itemService.findAll();

        res.json(items);
    }
}