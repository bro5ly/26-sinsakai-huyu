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
    // Webのセッションの番号はHttpOnlyのCookieにあるので、どの呼び出しにもCookieを付ける(A8-3)。
    // 書き換えのリクエストにはブラウザがOriginを付け、サーバーはそれを確かめる(A8-7)
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: "include",
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

  // bearer はタブレットのセッション(カード + PINで作ったもの)だけが使う。画面のメモリにだけ持ち、Cookieにはしない
  private static authorization(bearer?: string): HeadersInit {
    return bearer ? { Authorization: `Bearer ${bearer}` } : {};
  }

  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  public async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) });
  }

  public async delete<T>(endpoint: string, options: { bearer?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers: ApiService.authorization(options.bearer) });
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options: { bearer?: string } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: ApiService.authorization(options.bearer),
    });
  }
}
