import type { CurrentTabletDevice, RegisterTabletDeviceRequest, TabletDevice } from "@sinsakai/shared";
import { ApiService } from "./api.service";
import {
  TabletSigninResponse,
  CheckoutResponse,
  ReturnResponse,
} from "@/types";

class TabletService extends ApiService {
  // この端末が登録されているか(と名前)。されていなければ ApiError(code: DEVICE_NOT_REGISTERED)
  async getDevice(): Promise<CurrentTabletDevice> {
    return this.get<CurrentTabletDevice>("/api/tablet/device");
  }

  // 管理者がこのタブレットの上で登録する(UC-20)。端末の番号はサーバーがHttpOnlyのCookieに入れる
  async registerDevice(request: RegisterTabletDeviceRequest): Promise<TabletDevice> {
    return this.post<TabletDevice>("/api/tablet-devices", request);
  }

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
