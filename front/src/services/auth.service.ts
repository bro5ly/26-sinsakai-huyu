import type { Session, VerificationToken } from "@sinsakai/shared";
import { ApiService } from "./api.service";
import { MyInfoResponse } from "@/types";

// 登録・ログインのURLと形は docs/api.md 4.1・shared/src/auth.ts。リフレッシュトークンはHttpOnly Cookieなので credentials: "include" が要る
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
    return this.post<Session>(
      "/api/users",
      { token, password },
      { credentials: "include" }
    );
  }

  async login(studentId: string, password: string): Promise<Session> {
    return this.post<Session>(
      "/api/sessions",
      { studentId, password },
      { credentials: "include" }
    );
  }

  async logout(): Promise<void> {
    try {
      await this.delete<void>("/api/sessions/current", {
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout request failed", error);
    }
  }

  async getMyInfo(accessToken: string): Promise<MyInfoResponse> {
    return this.get<MyInfoResponse>("/api/items/me", accessToken);
  }

  async refreshSession(): Promise<Session> {
    return this.post<Session>("/api/sessions/refresh", undefined, {
      credentials: "include",
    });
  }
}

export const authService = new AuthService();
