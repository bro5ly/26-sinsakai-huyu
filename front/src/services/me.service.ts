import type { Me, MyRentals, SetPinRequest } from "@sinsakai/shared";
import { ApiService } from "./api.service";

// ログイン中の本人(docs/api.md 4.2・shared/src/me.ts)。どちらもWebのセッション(Cookie)が要る
class MeService extends ApiService {
  async getMe(): Promise<Me> {
    return this.get<Me>("/api/me");
  }

  // 借りている物は貸し出すたびに変わるので、ログインの状態には入れず、使う画面がその都度取る(2026-10-25 Me2)
  async getMyRentals(): Promise<MyRentals> {
    return this.get<MyRentals>("/api/me/rentals");
  }

  // パスワードを入れ直して、タブレット用のPINを登録・変更する(UC-7。2026-10-28 P1)。ロックも解ける
  async setPin(request: SetPinRequest): Promise<void> {
    await this.put<void>("/api/me/pin", request);
  }
}

export const meService = new MeService();
