export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
    /** Stable server code when present (e.g. referral provisioning). */
    public code?: string,
    /** Optional top-level fields from error JSON (e.g. userGroupId on join conflict). */
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
    let errorDetails: unknown;
    let code: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.error || errorData.message || "An error occurred";
      errorDetails = errorData.details;
      if (typeof errorData.code === "string") code = errorData.code;

      const { error: _e, message: _m, details: _d, code: _c, ...rest } = errorData;
      const context = Object.keys(rest).length > 0 ? rest : undefined;

      throw new ApiError(response.status, errorMessage, errorDetails, code, context);
    } catch (parseError) {
      if (parseError instanceof ApiError) {
        throw parseError;
      }
      // keep fallback errorMessage
    }

    throw new ApiError(response.status, errorMessage, errorDetails, code);
  }

  // Return undefined for 204 responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
