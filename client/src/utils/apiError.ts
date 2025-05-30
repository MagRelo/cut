export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    let errorDetails: unknown;

    try {
      // Try to parse the error response as JSON
      const errorData = await response.json();
      errorMessage =
        errorData.error || errorData.message || 'An error occurred';
      errorDetails = errorData.details;
    } catch {
      // If parsing fails, use the status text or a generic message
      errorMessage =
        response.statusText || `HTTP error! status: ${response.status}`;
    }

    throw new ApiError(response.status, errorMessage, errorDetails);
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
