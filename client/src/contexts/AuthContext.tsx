import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface AuthTeam {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  teams: AuthTeam[];
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  streamToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamToken, setStreamToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      api
        .get<User>('/auth/me')
        .then((response) => {
          setUser(response);

          // We also need to get a fresh stream token here
          api
            .get<{ streamToken: string }>('/auth/stream-token')
            .then(({ streamToken: newStreamToken }) => {
              setStreamToken(newStreamToken);
            })
            .catch((error) => {
              console.error('Failed to get stream token:', error);
            });
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    const { streamToken: newStreamToken, ...userData } = response;
    setUser(userData);
    setStreamToken(newStreamToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setStreamToken(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const userData = await api.register(email, password, name);
    setUser(userData);
  };

  const forgotPassword = async (email: string) => {
    await api.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string) => {
    await api.resetPassword(token, password);
  };

  const verifyEmail = async (token: string) => {
    await api.verifyEmail(token);
  };

  const resendVerificationEmail = async () => {
    await api.resendVerification();
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
        verifyEmail,
        resendVerificationEmail,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
