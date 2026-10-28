import { ApiService } from "./api.service";
import {
  TabletSigninResponse,
  CheckoutResponse,
  ReturnResponse,
} from "@/types";

class TabletService extends ApiService {
  async signin(serialNumber: string): Promise<TabletSigninResponse> {
    return this.post<TabletSigninResponse>("/api/tablet/signin", {
      serialNumber,
    });
  }

  async checkout(barcode: string, token: string): Promise<CheckoutResponse> {
    return this.post<CheckoutResponse>(
      "/api/tablet/checkout",
      { barcode },
      { bearer: token }
    );
  }

  async returnItem(barcode: string, token: string): Promise<ReturnResponse> {
    return this.post<ReturnResponse>(
      "/api/tablet/return",
      { barcode },
      { bearer: token }
    );
  }
}

export const tabletService = new TabletService();
