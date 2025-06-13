import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useAccount } from 'wagmi';
import { handleApiResponse, ApiError } from '../utils/apiError';
import { type TournamentLineup } from '../types.new/player';

interface PortoUser {
  id: string;
  name: string;
  userType: string;
  settings: Record<string, unknown> | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  tournamentLineups: Array<TournamentLineup>;
  userGroups: Array<unknown>;
  token: string;
}

interface PortoAuthContextData {
  user: PortoUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUser: (updatedUser: { name?: string }) => Promise<void>;
  updateUserSettings: (settings: Record<string, unknown>) => Promise<void>;
  isAdmin: () => boolean;
  getCurrentUser: () => PortoUser | null;
}

const PortoAuthContext = createContext<PortoAuthContextData | undefined>(
  undefined
);

export function usePortoAuth() {
  const context = useContext(PortoAuthContext);
  if (!context) {
    throw new Error('usePortoAuth must be used within a PortoAuthProvider');
  }
  return context;
}

export function PortoAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId } = useAccount();
  const [user, setUser] = useState<PortoUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    async <T,>(
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

      try {
        return await handleApiResponse<T>(response);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          localStorage.removeItem('portoToken');
        }
        throw error;
      }
    },
    [config]
  );

  const logout = useCallback(async () => {
    try {
      await request<void>('POST', '/auth/logout');
    } catch (error) {
      console.error('Error on logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('portoToken');
    }
  }, [request]);

  const updateUser = useCallback(
    async (updatedUser: { name?: string }) => {
      try {
        const response = await request<{ user: PortoUser }>(
          'PUT',
          '/auth/update',
          updatedUser
        );
        setUser((prev) =>
          prev ? { ...prev, name: response.user.name } : null
        );
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, 'Failed to update user');
      }
    },
    [request]
  );

  const updateUserSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      try {
        await request<{ settings: Record<string, unknown> }>(
          'PUT',
          '/auth/settings',
          settings
        );
        setUser((prev) => (prev ? { ...prev, settings } : null));
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, 'Failed to update user settings');
      }
    },
    [request]
  );

  const getCurrentUser = useCallback((): PortoUser | null => {
    return user;
  }, [user]);

  const isAdmin = useCallback(() => {
    return Boolean(user?.userType === 'ADMIN');
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!address) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('portoToken');

        if (token) {
          try {
            const response = await request<PortoUser>('GET', '/auth/me');
            setUser(response);
            return;
          } catch (error) {
            console.error('Token authentication failed:', error);
            if (
              error instanceof Error &&
              (error.message.includes('401') || error.message.includes('404'))
            ) {
              localStorage.removeItem('portoToken');
              setUser(null);
            } else {
              setLoading(false);
              return;
            }
          }
        }

        // If no token or token invalid, try to authenticate with address
        try {
          const response = await request<PortoUser>('POST', '/auth/web3', {
            address,
            chainId,
          });
          setUser(response);
          localStorage.setItem('portoToken', response.token);
        } catch (error) {
          console.error('Web3 authentication failed:', error);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [address, request]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      logout,
      updateUser,
      updateUserSettings,
      isAdmin,
      getCurrentUser,
    }),
    [
      user,
      loading,
      logout,
      updateUser,
      updateUserSettings,
      isAdmin,
      getCurrentUser,
    ]
  );

  return (
    <PortoAuthContext.Provider value={contextValue}>
      {children}
    </PortoAuthContext.Provider>
  );
}
