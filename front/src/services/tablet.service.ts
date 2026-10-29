import type { CreateTabletSessionRequest, CurrentTabletDevice, RegisterTabletDeviceRequest, Rental, TabletDevice, TabletSession } from "@sinsakai/shared";
import { ApiService } from "./api.service";

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

  // 本人確認したセッションで借りる(判断表C)
  async rentItem(barcode: string, token: string): Promise<Rental> {
    return this.post<Rental>("/api/tablet/rentals", { barcode }, { bearer: token });
  }

  // 返却は、登録された端末ならカードもPINも要らない(A-Q4・E7)
  async returnItem(barcode: string): Promise<Rental> {
    return this.post<Rental>("/api/tablet/returns", { barcode });
  }
}

export const tabletService = new TabletService();
