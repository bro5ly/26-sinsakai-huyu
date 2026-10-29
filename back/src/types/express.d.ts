import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
      // createDeviceMiddleware が入れる、リクエストを送ってきたタブレットの端末(docs/auth.md R-A2)
      device?: {
        id: string;
        name: string;
      };
    }
  }
}