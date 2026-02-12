import { ApiService } from "./api.service";
import {
  RequestVerificationResponse,
  VerifyCodeResponse,
  AuthResponse,
  MyInfoResponse,
} from "@/types";

class AuthService extends ApiService {
  async requestVerification(
    studentId: string
  ): Promise<RequestVerificationResponse> {
    const response = await this.post<RequestVerificationResponse>(
      "/api/auth/request-verification",
      { studentId }
    );
    return response;
  }

  async verifyCode(
    studentId: string,
    code: string
  ): Promise<VerifyCodeResponse> {
    const response = await this.post<VerifyCodeResponse>("/api/auth/verify-code", {
      studentId,
      code,
    });
    return response;
  }

  async signup(
    plainPassword: string,
    registrationToken: string
  ): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      "/api/auth/signup",
      { plainPassword, registrationToken },
      { credentials: "include" }
    );
    return response;
  }

  async login(
    studentId: string,
    plainPassword: string
  ): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      "/api/auth/login",
      { studentId, plainPassword },
      { credentials: "include" }
    );
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post<void>("/api/auth/logout", undefined, {
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout request failed", error);
    }
  }

  async getMyInfo(accessToken: string): Promise<MyInfoResponse> {
    return this.get<MyInfoResponse>("/api/items/me", accessToken);
  }

  async refreshSession(): Promise<AuthResponse> {
    return this.post<AuthResponse>("/api/auth/refreshSession", undefined, {
      credentials: "include",
    });
  }
}

export const authService = new AuthService();
