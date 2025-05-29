import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { z } from 'zod';

// Validation schemas matching server
const contactSchema = z.object({
  contact: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
});

const verifySchema = z.object({
  contact: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
  code: z.string().length(6),
  name: z.string().min(2).optional(),
  anonymousGuid: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
});

interface BaseUser {
  id: string;
  isAnonymous: boolean;
}

interface AuthenticatedUser extends BaseUser {
  isAnonymous: false;
  email: string | null;
  phone: string | null;
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
  requestVerification: (contact: string) => Promise<void>;
  verifyAndLogin: (contact: string, code: string) => Promise<void>;
  verifyAndRegister: (
    contact: string,
    code: string,
    name: string,
    anonymousGuid?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: z.infer<typeof updateUserSchema>) => Promise<void>;
  isAdmin: () => boolean;
  getCurrentUser: () => User;
  upgradeAnonymousUser: (contact: string, code: string) => Promise<void>;
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

  const requestVerification = useCallback(
    async (contact: string) => {
      const validatedData = contactSchema.parse({ contact });
      await request<{ success: boolean }>(
        'POST',
        '/auth/request-verification',
        validatedData,
        true
      );
    },
    [request]
  );

  const verifyAndLogin = useCallback(
    async (contact: string, code: string) => {
      const validatedData = verifySchema.parse({ contact, code });
      const response = await request<AuthenticatedUser>(
        'POST',
        '/auth/verify',
        validatedData,
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

  const verifyAndRegister = useCallback(
    async (
      contact: string,
      code: string,
      name: string,
      anonymousGuid?: string
    ) => {
      const validatedData = verifySchema.parse({
        contact,
        code,
        name,
        anonymousGuid,
      });
      const response = await request<AuthenticatedUser>(
        'POST',
        '/auth/verify',
        validatedData,
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
  }, [request]);

  const updateUser = useCallback(
    async (updatedUser: z.infer<typeof updateUserSchema>) => {
      const validatedData = updateUserSchema.parse(updatedUser);
      const response = await request<AuthenticatedUser>(
        'PUT',
        '/auth/update',
        validatedData
      );
      const authenticatedUser: AuthenticatedUser = {
        ...response,
        isAnonymous: false,
      };
      setUser(authenticatedUser);
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
    return {
      id: 'pending',
      isAnonymous: true,
      guid: 'pending',
    };
  }, [user]);

  const isAdmin = useCallback(() => {
    return Boolean(user && !user.isAnonymous && user.userType === 'ADMIN');
  }, [user]);

  const upgradeAnonymousUser = useCallback(
    async (contact: string, code: string) => {
      const guid = localStorage.getItem('publicUserGuid');
      if (!guid) {
        throw new Error('No anonymous user found');
      }
      await verifyAndRegister(contact, code, '', guid);
    },
    [verifyAndRegister]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing auth');

      try {
        const token = localStorage.getItem('token');
        const guid = localStorage.getItem('publicUserGuid');

        if (token) {
          console.log('Using token', token);
          try {
            const response = await request<AuthenticatedUser>(
              'GET',
              '/auth/me'
            );
            const authenticatedUser: AuthenticatedUser = {
              ...response,
              isAnonymous: false,
            };
            setUser(authenticatedUser);
            return; // Exit early if we successfully authenticated with token
          } catch (error) {
            console.error('Token authentication failed:', error);
            // Only clear token if we get a 401 Unauthorized
            if (error instanceof Error && error.message.includes('401')) {
              localStorage.removeItem('token');
              localStorage.removeItem('userId');
            } else {
              // For other errors, keep the token and try again later
              setLoading(false);
              return;
            }
          }
        }

        // Only proceed with anonymous user if we don't have a valid token
        if (guid) {
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
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [request]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      streamToken,
      requestVerification,
      verifyAndLogin,
      verifyAndRegister,
      logout,
      updateUser,
      isAdmin,
      getCurrentUser,
      upgradeAnonymousUser,
    }),
    [
      user,
      loading,
      streamToken,
      requestVerification,
      verifyAndLogin,
      verifyAndRegister,
      logout,
      updateUser,
      isAdmin,
      getCurrentUser,
      upgradeAnonymousUser,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
