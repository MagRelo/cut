import { createContext, useContext, useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { streamClient } from '../services/chatService';

interface User {
  id: string;
  email: string;
  name: string;
  userType: string;
  teams: Array<{
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
  }>;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  streamToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  isAdmin: () => boolean;
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
  const api = new ApiService();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.get<User>('/auth/me');
          setUser(response);
          const { streamToken: newStreamToken } = await api.get<{
            streamToken: string;
          }>('/auth/stream-token');
          setStreamToken(newStreamToken);
        }
      } catch (error: unknown) {
        console.error('Auth check failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response);
    setStreamToken(response.streamToken);
  };

  const logout = async () => {
    try {
      await streamClient.disconnectUser();
    } catch (error) {
      console.error('Error disconnecting from Stream:', error);
    } finally {
      setUser(null);
      setStreamToken(null);
      localStorage.removeItem('token');
    }
  };

  const updateUser = async (user: User) => {
    setUser(user);
    // Fetch a fresh stream token when updating user data
    try {
      const { streamToken: newStreamToken } = await api.get<{
        streamToken: string;
      }>('/auth/stream-token');
      setStreamToken(newStreamToken);
    } catch (error) {
      console.error('Failed to refresh stream token:', error);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.register(email, password, name);
    setUser(response);
    setStreamToken(response.streamToken);
  };

  const forgotPassword = async (email: string) => {
    await api.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string) => {
    await api.resetPassword(token, password);
  };

  const isAdmin = () => {
    return user?.userType === 'ADMIN';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        streamToken,
        login,
        logout,
        updateUser,
        register,
        forgotPassword,
        resetPassword,
        isAdmin,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
