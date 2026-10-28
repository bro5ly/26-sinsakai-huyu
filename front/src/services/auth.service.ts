import type { Session, VerificationToken } from "@sinsakai/shared";
import { ApiService } from "./api.service";

// 登録・ログインのURLと形は docs/api.md 4.1・shared/src/auth.ts。セッションの番号はサーバーがHttpOnlyのCookieに入れる(A8-3)
class AuthService extends ApiService {
  async requestVerification(studentId: string): Promise<void> {
    await this.post<void>("/api/verification-codes", {
      studentId,
      purpose: "signup",
    });
  }

  async verifyCode(studentId: string, code: string): Promise<VerificationToken> {
    return this.post<VerificationToken>("/api/verification-tokens", {
      studentId,
      purpose: "signup",
      code,
    });
  }

  async signup(password: string, token: string): Promise<Session> {
    return this.post<Session>("/api/users", { token, password });
  }

  async login(studentId: string, password: string): Promise<Session> {
    return this.post<Session>("/api/sessions", { studentId, password });
  }

  async logout(): Promise<void> {
    try {
      await this.delete<void>("/api/sessions/current");
    } catch (error) {
      console.warn("Logout request failed", error);
    }
  }
}

export const authService = new AuthService();
