import { handleApiResponse, ApiError } from "./apiError";
import { getBearerForApi, getOptionalChainIdForApi } from "../lib/authToken";

interface ApiConfig {
  baseURL: string;
  headers?: Record<string, string>;
}

interface RequestOptions {
  isPublic?: boolean;
  requiresAuth?: boolean;
  data?: unknown;
}

export class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      baseURL: config.baseURL || "http://localhost:3000/api",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    };
  }

  private async buildHeaders(options: RequestOptions = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      ...this.config.headers,
    };

    if (options.isPublic) {
      headers["X-Public-Api"] = "true";
    }

    const token = await getBearerForApi();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const chainId = getOptionalChainIdForApi();
    if (typeof chainId === "number") {
      headers["X-Cut-Chain-Id"] = String(chainId);
    }

    return headers;
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    try {
      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        method,
        headers: await this.buildHeaders(options),
        body: data ? JSON.stringify(data) : undefined,
        credentials: "omit",
      });

      return await handleApiResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        console.error("Unauthorized request");
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, options?.data, options);
  }
}

const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

export default apiClient;
