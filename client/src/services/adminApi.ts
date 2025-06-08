import { handleApiResponse } from '../utils/apiError';

const config = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
};

export const useAdminApi = () => {
  const request = async <T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> => {
    const headers: Record<string, string> = {
      ...config.headers,
    };

    const token = localStorage.getItem('portoToken');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${config.baseURL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleApiResponse<T>(response);
  };

  return {
    request,
  };
};
