import type { Me, MyRentals } from "@sinsakai/shared";
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
}

export const meService = new MeService();
