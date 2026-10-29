import type { CreateTabletSessionRequest, CurrentTabletDevice, RegisterTabletDeviceRequest, TabletDevice, TabletSession } from "@sinsakai/shared";
import { ApiService } from "./api.service";
import { CheckoutResponse, ReturnResponse } from "@/types";

class TabletService extends ApiService {
  // この端末が登録されているか(と名前)。されていなければ ApiError(code: DEVICE_NOT_REGISTERED)
  async getDevice(): Promise<CurrentTabletDevice> {
    return this.get<CurrentTabletDevice>("/api/tablet/device");
  }

  // 管理者がこのタブレットの上で登録する(UC-20)。端末の番号はサーバーがHttpOnlyのCookieに入れる
  async registerDevice(request: RegisterTabletDeviceRequest): Promise<TabletDevice> {
    return this.post<TabletDevice>("/api/tablet-devices", request);
  }

  // カードとPINを一緒に送る(カードだけでは何も分からないように。R-A12)。番号は画面のメモリにだけ持つ
  async startSession(request: CreateTabletSessionRequest): Promise<TabletSession> {
    return this.post<TabletSession>("/api/tablet/sessions", request);
  }

  // 「終わる」・完了の10秒・無操作で、サーバーのセッションもすぐ無効にする(R-A10)
  async endSession(token: string): Promise<void> {
    await this.delete<void>("/api/tablet/sessions/current", { bearer: token });
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
