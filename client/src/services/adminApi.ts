import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SystemProcessRecord {
  id: string;
  processType: string;
  status: string;
  processData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  userType: string;
  createdAt: string;
}

export const useAdminApi = () => {
  const { getCurrentUser } = useAuth();

  const config = useMemo(
    () => ({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    []
  );

  const request = useCallback(
    async <T>(method: string, endpoint: string, data?: unknown): Promise<T> => {
      const user = getCurrentUser();
      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers: {
          ...config.headers,
          'X-User-Guid': user.id,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    [config, getCurrentUser]
  );

  const getUsers = useCallback(async () => {
    return request<User[]>('GET', '/admin/users');
  }, [request]);

  const getSystemProcesses = useCallback(async () => {
    return request<SystemProcessRecord[]>('GET', '/admin/system-processes');
  }, [request]);

  return useMemo(
    () => ({
      getUsers,
      getSystemProcesses,
    }),
    [getUsers, getSystemProcesses]
  );
};

// Export type definitions
export type { SystemProcessRecord, User };
