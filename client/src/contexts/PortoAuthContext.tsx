import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { handleApiResponse, ApiError } from "../utils/apiError";

interface PortoUser {
  id: string;
  name: string;
  userType: string;
  settings: Record<string, unknown> | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  userGroups: Array<unknown>;
  token: string;
  chainId: number;
  walletAddress: string;
}

interface PortoAuthContextData {
  user: PortoUser | null;
  loading: boolean;
  updateUser: (updatedUser: { name?: string }) => Promise<void>;
  updateUserSettings: (settings: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  getCurrentUser: () => PortoUser | null;
}

const PortoAuthContext = createContext<PortoAuthContextData | undefined>(undefined);

export function usePortoAuth() {
  const context = useContext(PortoAuthContext);
  if (!context) {
    throw new Error("usePortoAuth must be used within a PortoAuthProvider");
  }
  return context;
}

export function PortoAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId: currentChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [user, setUser] = useState<PortoUser | null>(null);
  const [loading, setLoading] = useState(true);

  const config = useMemo(
    () => ({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
      headers: {
        "Content-Type": "application/json",
      },
    }),
    []
  );

  const request = useCallback(
    async <T,>(method: string, endpoint: string, data?: unknown): Promise<T> => {
      const headers: Record<string, string> = {
        ...config.headers,
      };

      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include", // Include cookies in the request
      });

      try {
        return await handleApiResponse<T>(response);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          // Clear any stored auth data on 401
          setUser(null);
        }
        throw error;
      }
    },
    [config]
  );

  const updateUser = useCallback(
    async (updatedUser: { name?: string }) => {
      try {
        const response = await request<{ user: PortoUser }>("PUT", "/auth/update", updatedUser);
        setUser((prev) => (prev ? { ...prev, name: response.user.name } : null));
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user");
      }
    },
    [request]
  );

  const updateUserSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      try {
        await request<{ settings: Record<string, unknown> }>("PUT", "/auth/settings", settings);
        setUser((prev) => (prev ? { ...prev, settings } : null));
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user settings");
      }
    },
    [request]
  );

  const getCurrentUser = useCallback((): PortoUser | null => {
    return user;
  }, [user]);

  const isAdmin = useCallback(() => {
    return Boolean(user?.userType === "ADMIN");
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!address) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Check if auth cookie exists by making a request to /me
        const response = await request<PortoUser>("GET", "/auth/me");

        // Switch to preferred chain if user is connected and chain is different
        if (address && currentChainId && currentChainId !== response.chainId) {
          try {
            await switchChain({ chainId: response.chainId as 8453 | 84532 });
          } catch (switchError) {
            console.warn("Failed to switch chain:", switchError);
            // Continue with user setup even if chain switch fails
          }
        }

        setUser(response);
      } catch (error) {
        console.error("Auth check failed:", error);
        if (
          error instanceof Error &&
          (error.message.includes("401") || error.message.includes("404"))
        ) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [address, request, currentChainId, switchChain]);

  // Clear user data when wallet disconnects
  useEffect(() => {
    if (!address) {
      setUser(null);
    }
  }, [address]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      updateUser,
      updateUserSettings,
      logout,
      isAdmin,
      getCurrentUser,
    }),
    [user, loading, updateUser, updateUserSettings, logout, isAdmin, getCurrentUser]
  );

  return <PortoAuthContext.Provider value={contextValue}>{children}</PortoAuthContext.Provider>;
}
