const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5454';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth API用の型定義
export interface AuthUser {
  id: string;
  studentId: string;
  serialNumber?: string | null;
  name: string;
  email?: string | null;
  grade?: string | null;
  major?: string | null;
  userType: string;
  isActive: boolean;
}

export interface RequestVerificationResponse {
  success: boolean;
  message: string;
  registrationToken: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  registrationToken: string;
}

export interface SignupResponse {
  success: boolean;
  user: AuthUser;
  accessToken: string;
}

export interface LoginResponse {
  success: boolean;
  user: AuthUser;
  accessToken: string;
}

export interface MyInfoResponse {
  success: boolean;
  data: AuthUser & {
    rentalSetting: {
      canBorrow: boolean;
      maxItems: number;
    } | null;
    rentals: Array<{
      id: string;
      rentedAt: string;
      dueDate: string;
      status: string;
      item: {
        id: string;
        barcode: string;
        location: string;
        status: string;
        itemType: {
          title: string;
          description?: string;
          manufacturer?: string;
          model?: string;
          genre: {
            name: string;
            category: {
              name: string;
            };
          };
        };
      };
    }>;
  };
}

export interface ItemsResponse {
  success: boolean;
  data: Array<{
    id: string;
    barcode: string;
    location: string;
    status: string;
    itemType: {
      title: string;
      description?: string;
      manufacturer?: string;
      model?: string;
      imageUrl?: string;
      rentalPeriodDays: number;
      genre: {
        name: string;
        category: {
          name: string;
        };
      };
    };
  }>;
}

class AuthApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // 認証コード送信リクエスト
  async requestVerification(studentId: string): Promise<RequestVerificationResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/request-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || '認証コード送信に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // 認証コード検証
  async verifyCode(studentId: string, code: string): Promise<VerifyCodeResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentId, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || '認証コード検証に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // サインアップ
  async signup(plainPassword: string, registrationToken: string): Promise<SignupResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ plainPassword, registrationToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || 'サインアップに失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // ログイン
  async login(studentId: string, plainPassword: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ studentId, plainPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || 'ログインに失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // ログアウト
  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // HttpOnly Cookie (RT) をサーバーに送信して消してもらう
    });

    // ログアウトの場合、サーバー側でエラーが起きてもフロント側では強制的に処理を進めることが多いため、
    // 厳密なエラーチェックをしても良いですが、基本は「呼ぶこと」に意味があります。
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.warn('Logout request failed', data.message);
      // ここでエラーを投げても良いですが、フロントの状態を消すのが優先です
    }
  }

  // 自分の情報取得
  async getMyInfo(accessToken: string): Promise<MyInfoResponse> {
    const response = await fetch(`${this.baseUrl}/api/items/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || '情報の取得に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // 全アイテム取得
  async getAllItems(): Promise<ItemsResponse> {
    const response = await fetch(`${this.baseUrl}/api/items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || 'アイテムの取得に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  // リフレッシュトークンでセッションを更新
  async refreshSession(): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/refreshSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Cookieを送信
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || data.message || 'セッションの更新に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }
}

export const authApi = new AuthApi();
