import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';

interface BaseUser {
  id: string;
  isAnonymous: boolean;
}

interface AuthenticatedUser extends BaseUser {
  isAnonymous: false;
  email: string;
  name: string;
  userType: string;
  token: string;
  streamToken: string;
  teams: Array<{
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
  }>;
}

interface AnonymousUser extends BaseUser {
  isAnonymous: true;
  guid: string;
}

type User = AuthenticatedUser | AnonymousUser;

interface AuthContextData {
  user: User | null;
  loading: boolean;
  streamToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: AuthenticatedUser) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  isAdmin: () => boolean;
  getCurrentUser: () => User;
  upgradeAnonymousUser: (
    contact: string,
    verificationCode?: string
  ) => Promise<AuthenticatedUser | { success: boolean }>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamToken, setStreamToken] = useState<string | null>(null);

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
      data?: unknown,
      isPublic: boolean = false
    ): Promise<T> => {
      const headers: Record<string, string> = {
        ...config.headers,
      };

      const token = localStorage.getItem('token');
      const guid = localStorage.getItem('publicUserGuid');

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (guid) {
        headers['X-User-Guid'] = guid;
      }

      if (isPublic) {
        headers['X-Public-Api'] = 'true';
      }

      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Authentication failed');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
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
      setStreamToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
  }, []);

  const getCurrentUser = useCallback((): User => {
    if (user) {
      return user;
    }
    const storedGuid = localStorage.getItem('publicUserGuid');
    if (storedGuid) {
      const anonymousUser: AnonymousUser = {
        id: storedGuid,
        isAnonymous: true,
        guid: storedGuid,
      };
      setUser(anonymousUser);
      return anonymousUser;
    }
    const guid = crypto.randomUUID();
    localStorage.setItem('publicUserGuid', guid);
    const anonymousUser: AnonymousUser = {
      id: guid,
      isAnonymous: true,
      guid,
    };
    setUser(anonymousUser);
    return anonymousUser;
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing auth');

      try {
        const token = localStorage.getItem('token');
        const guid = localStorage.getItem('publicUserGuid');

        if (token) {
          console.log('Using token', token);
          const response = await request<AuthenticatedUser>('GET', '/auth/me');
          const authenticatedUser: AuthenticatedUser = {
            ...response,
            isAnonymous: false,
          };
          setUser(authenticatedUser);
        } else if (guid) {
          console.log('Using guid', guid);

          const anonymousUser: AnonymousUser = {
            id: guid,
            isAnonymous: true,
            guid,
          };
          setUser(anonymousUser);
        } else {
          const newGuid = crypto.randomUUID();
          localStorage.setItem('publicUserGuid', newGuid);
          const anonymousUser: AnonymousUser = {
            id: newGuid,
            isAnonymous: true,
            guid: newGuid,
          };
          setUser(anonymousUser);
        }
      } catch (error: unknown) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [request]);

  const upgradeAnonymousUser = useCallback(
    async (contact: string, verificationCode?: string) => {
      const currentUser = getCurrentUser();
      if (!currentUser.isAnonymous) {
        throw new Error('User is already authenticated');
      }

      if (!verificationCode) {
        // Request verification code
        const response = await request<{ success: boolean }>(
          'POST',
          '/auth/request-verification',
          {
            contact,
            anonymousGuid: currentUser.guid,
          },
          true
        );
        return response;
      } else {
        // Complete upgrade with verification code
        const response = await request<AuthenticatedUser>(
          'POST',
          '/auth/verify-and-upgrade',
          {
            contact,
            verificationCode,
            anonymousGuid: currentUser.guid,
          },
          true
        );
        const authenticatedUser: AuthenticatedUser = {
          ...response,
          isAnonymous: false,
        };
        setUser(authenticatedUser);
        setStreamToken(response.streamToken);
        localStorage.setItem('token', response.token);
        localStorage.setItem('userId', response.id);
        localStorage.removeItem('publicUserGuid');
        return response;
      }
    },
    [request, getCurrentUser]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await request<AuthenticatedUser>(
        'POST',
        '/auth/login',
        { email, password },
        true
      );
      const authenticatedUser: AuthenticatedUser = {
        ...response,
        isAnonymous: false,
      };
      setUser(authenticatedUser);
      setStreamToken(response.streamToken);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.id);
      localStorage.removeItem('publicUserGuid');
    },
    [request]
  );

  const updateUser = useCallback(
    async (updatedUser: AuthenticatedUser) => {
      setUser(updatedUser);
      try {
        const { streamToken: newStreamToken } = await request<{
          streamToken: string;
        }>('GET', '/auth/stream-token');
        setStreamToken(newStreamToken);
      } catch (error) {
        console.error('Failed to refresh stream token:', error);
      }
    },
    [request]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await request<AuthenticatedUser>(
        'POST',
        '/auth/register',
        { email, password, name },
        true
      );
      const authenticatedUser: AuthenticatedUser = {
        ...response,
        isAnonymous: false,
      };
      setUser(authenticatedUser);
      setStreamToken(response.streamToken);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.id);
      localStorage.removeItem('publicUserGuid');
    },
    [request]
  );

  const forgotPassword = useCallback(
    async (email: string) => {
      await request<{ message: string }>(
        'POST',
        '/auth/forgot-password',
        { email },
        true
      );
    },
    [request]
  );

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      await request<{ message: string }>(
        'POST',
        '/auth/reset-password',
        { token, newPassword: password },
        true
      );
    },
    [request]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await request<{ message: string }>('POST', '/auth/change-password', {
        currentPassword,
        newPassword,
      });
    },
    [request]
  );

  const isAdmin = useCallback(() => {
    return Boolean(user && !user.isAnonymous && user.userType === 'ADMIN');
  }, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      streamToken,
      login,
      logout,
      updateUser,
      register,
      forgotPassword,
      resetPassword,
      changePassword,
      isAdmin,
      getCurrentUser,
      upgradeAnonymousUser,
    }),
    [
      user,
      loading,
      streamToken,
      login,
      logout,
      updateUser,
      register,
      forgotPassword,
      resetPassword,
      changePassword,
      isAdmin,
      getCurrentUser,
      upgradeAnonymousUser,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
