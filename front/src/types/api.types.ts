import type { ErrorCode } from "@sinsakai/shared";
import { User, RentalSetting } from "./user.types";
import { Item } from "./item.types";
import { Rental } from "./rental.types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    // サーバーのcode(shared/ の表)。NO_CONTENTは画面だけで使う
    public code?: ErrorCode | "NO_CONTENT"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Base API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// 登録・ログインの応答の型は shared/(@sinsakai/shared)の Session・VerificationToken を使う

export interface MyInfoResponse {
  success: boolean;
  data: User & {
    rentalSetting: RentalSetting | null;
    rentals: Rental[];
  };
}

export interface ItemsResponse extends ApiResponse {
  data: Item[];
}

export interface ItemDetailResponse extends ApiResponse {
  data: Item[];
}

// Tablet API Responses
export interface TabletSigninResponse extends ApiResponse {
  session: string;
  user: User;
  data: Rental[];
}

export interface CheckoutResponse extends ApiResponse {
  data: Rental;
}

export interface ReturnResponse extends ApiResponse {
  data: Rental;
}

// Barcode types
export interface BarcodeItem {
  code: string;
  name: string;
  type: string;
}
