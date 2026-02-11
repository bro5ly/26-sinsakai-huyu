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

export interface User {
  id: string;
  studentId: string;
  name: string;
  grade?: string | null;
  major?: string | null;
}

export interface SigninResponse {
  success: boolean;
  message: string;
  session: string;
  user: User;
  data: Rental[];
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data: Rental;
}

export interface ReturnResponse {
  success: boolean;
  message: string;
  data: Rental;
}

export interface Rental {
  id: string;
  itemId: string;
  userId: string;
  rentedAt: string;
  dueDate: string;
  returnedAt?: string;
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
      imageUrl?: string;
    };
  };
}

class TabletApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async signin(serialNumber: string): Promise<SigninResponse> {
    const response = await fetch(`${this.baseUrl}/api/tablet/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serialNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || '認証に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  async checkout(barcode: string, token: string): Promise<CheckoutResponse> {
    const response = await fetch(`${this.baseUrl}/api/tablet/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ barcode }),
    });

    // 204 No Contentの場合はJSONがない
    if (response.status === 204) {
      throw new ApiError('レスポンスが空です', 204, 'NO_CONTENT');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || '貸出に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }

  async returnItem(barcode: string, token: string): Promise<ReturnResponse> {
    const response = await fetch(`${this.baseUrl}/api/tablet/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ barcode }),
    });

    // 204 No Contentの場合はJSONがない
    if (response.status === 204) {
      throw new ApiError('レスポンスが空です', 204, 'NO_CONTENT');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || '返却に失敗しました',
        response.status,
        data.code
      );
    }

    return data;
  }
}

export const tabletApi = new TabletApi();
