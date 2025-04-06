import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  teamId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndRestoreUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get('/auth/me');
        setUser(userData);
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateAndRestoreUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem('token', response.token);
    setUser({
      id: response.id,
      email: response.email,
      name: response.name,
      emailVerified: response.emailVerified,
      teamId: response.teamId,
    });
  };

  const register = async (email: string, password: string, name: string) => {
    const userData = await api.register(email, password, name);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await api.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await api.resetPassword(token, newPassword);
  };

  const verifyEmail = async (token: string) => {
    const userData = await api.verifyEmail(token);
    setUser(userData);
  };

  const resendVerification = async () => {
    await api.resendVerification();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
