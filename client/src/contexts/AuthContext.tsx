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
    console.log('Login response:', {
      hasToken: !!response.token,
      hasStreamToken: !!response.streamToken,
      userId: response.id,
    });
    const { token: _, streamToken: newStreamToken, ...userData } = response;
    setUser(userData);
    setStreamToken(newStreamToken);
  };

  const logout = () => {
    console.log('Logging out, clearing tokens');
    localStorage.removeItem('token');
    setUser(null);
    setStreamToken(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  // Debug log auth state changes
  useEffect(() => {
    console.log('Auth state updated:', {
      isLoggedIn: !!user,
      userId: user?.id,
      hasStreamToken: !!streamToken,
    });
  }, [user, streamToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        streamToken,
        login,
        logout,
        updateUser,
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
