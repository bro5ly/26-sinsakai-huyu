import { problemSchema } from "@sinsakai/shared";
import { ApiError } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5454";

export class ApiService {
  protected baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // 本文の無い成功(202: 認証コードの送信、204: ログアウト)は、値を返さない(docs/api.md 3.2)
    if (response.status === 202 || response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // サーバーの失敗は shared/ の形(RFC 9457)で来る。形が違うとき(サーバーの外のエラーなど)は、codeを付けない
      const problem = problemSchema.safeParse(data);
      throw new ApiError(
        problem.success ? problem.data.detail : data.message || "リクエストに失敗しました",
        response.status,
        problem.success ? problem.data.code : undefined
      );
    }

    return data;
  }

  public async get<T>(
    endpoint: string,
    accessToken?: string
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }

  public async delete<T>(
    endpoint: string,
    options: { accessToken?: string; credentials?: RequestCredentials } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      headers: options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {},
      credentials: options.credentials,
    });
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options: { accessToken?: string; credentials?: RequestCredentials } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {},
      credentials: options.credentials,
    });
  }
}
