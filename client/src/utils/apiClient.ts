import { handleApiResponse, ApiError } from "./apiError";

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

  private getHeaders(options: RequestOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.config.headers,
    };

    // Add public API flag if specified
    if (options.isPublic) {
      headers["X-Public-Api"] = "true";
    }

    return headers;
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        method,
        headers: this.getHeaders(options),
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include", // Include cookies in the request
      });

      return await handleApiResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        // Handle unauthorized error - cookies will be handled by the server
        console.error("Unauthorized request");
      }
      throw error;
    }
  }

  // Convenience methods
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

// Create a singleton instance
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

export default apiClient;
