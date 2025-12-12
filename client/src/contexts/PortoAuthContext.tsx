import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAccount, useSwitchChain, useDisconnect, useBalance, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { handleApiResponse, ApiError } from "../utils/apiError";
import { getContractAddress } from "../utils/blockchainUtils";

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
  pendingTokenMint?: boolean;
  createdAt?: string;
}

interface PortoAuthContextData {
  user: PortoUser | null;
  loading: boolean;
  updateUser: (updatedUser: { name?: string }) => Promise<void>;
  updateUserSettings: (settings: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  getCurrentUser: () => PortoUser | null;
  // Token balance and metadata
  platformTokenBalance: bigint | undefined;
  paymentTokenBalance: bigint | undefined;
  platformTokenAddress: string | null;
  paymentTokenAddress: string | null;
  paymentTokenSymbol: string | undefined;
  paymentTokenDecimals: number | undefined;
  platformTokenSymbol: string | undefined;
  platformTokenDecimals: number | undefined;
  balancesLoading: boolean;
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
  const { address, chainId: currentChainId, status } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PortoUser | null>(null);
  const [loading, setLoading] = useState(false);
  const initializingRef = useRef(false);
  const lastAddressRef = useRef<string | undefined>(undefined);

  // Get contract addresses for current chain
  const platformTokenAddress = getContractAddress(currentChainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(currentChainId ?? 0, "paymentTokenAddress");

  // Fetch platform token balance with 30-second polling
  // Only poll when user is connected and authenticated
  const { data: platformTokenBalanceData, isLoading: platformBalanceLoading } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
    query: {
      enabled: !!address && !!platformTokenAddress && !!user,
      refetchInterval: user ? 30000 : false, // Only poll if user is authenticated
    },
  });

  // Fetch payment token balance with 30-second polling
  // Only poll when user is connected and authenticated
  const { data: paymentTokenBalanceData, isLoading: paymentBalanceLoading } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
    query: {
      enabled: !!address && !!paymentTokenAddress && !!user,
      refetchInterval: user ? 30000 : false, // Only poll if user is authenticated
    },
  });

  // Fetch payment token metadata
  // These values are immutable (never change), so cache indefinitely
  const { data: paymentTokenSymbol } = useReadContract({
    address: paymentTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: !!paymentTokenAddress,
      staleTime: Infinity, // Token symbol never changes, cache forever
    },
  });

  const { data: paymentTokenDecimals } = useReadContract({
    address: paymentTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!paymentTokenAddress,
      staleTime: Infinity, // Token decimals never change, cache forever
    },
  });

  // Fetch platform token metadata
  // These values are immutable (never change), so cache indefinitely
  const { data: platformTokenSymbol } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: !!platformTokenAddress,
      staleTime: Infinity, // Token symbol never changes, cache forever
    },
  });

  const { data: platformTokenDecimals } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!platformTokenAddress,
      staleTime: Infinity, // Token decimals never change, cache forever
    },
  });

  const balancesLoading = platformBalanceLoading || paymentBalanceLoading;

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
          // Clear all user data on 401 (unauthorized)
          // Don't clear queryClient here as it can cause infinite loops
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

  /**
   * Clear user data, auth state, and user-specific cached data
   * Used both for manual logout and when wallet disconnects
   * Note: Preserves public data like tournaments that don't require auth
   */
  const clearAllUserData = useCallback(() => {
    // Clear user state
    setUser(null);

    // Clear user-specific React Query cache (lineups, user data, balances, etc.)
    // but preserve public data (tournaments, contests, players, scores)
    queryClient.invalidateQueries({ queryKey: ["auth"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["lineups"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["user"] });
    queryClient.removeQueries({ queryKey: ["lineups"] });
    queryClient.removeQueries({ queryKey: ["balance"] });

    // Clear all cookies (including auth token)
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      // Clear for current path
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      // Clear for root
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    // Disconnect wagmi wallet
    disconnect();
  }, [queryClient, disconnect]);

  const logout = useCallback(() => {
    clearAllUserData();
  }, [clearAllUserData]);

  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple simultaneous initialization calls
      if (initializingRef.current) {
        return;
      }

      // If address hasn't changed, don't re-initialize
      if (address === lastAddressRef.current) {
        return;
      }

      if (!address) {
        // If there's no address, we can't authenticate, so ensure loading is false
        setUser(null);
        setLoading(false);
        lastAddressRef.current = undefined;
        return;
      }

      // Skip if we're already initializing for this address
      if (initializingRef.current && lastAddressRef.current === address) {
        return;
      }

      initializingRef.current = true;
      lastAddressRef.current = address;

      try {
        setLoading(true);
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

        // Invalidate only auth-dependent queries when auth refreshes
        // Don't invalidate public queries (tournaments) that don't depend on auth state
        queryClient.invalidateQueries({ queryKey: ["lineups"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["balance"] });
      } catch (error) {
        console.error("Auth check failed:", error);
        if (
          error instanceof Error &&
          (error.message.includes("401") || error.message.includes("404"))
        ) {
          setUser(null);
          // Don't retry on 401/404 - user is not authenticated
        }
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    };

    initializeAuth();
    // request is stable (only depends on config which is memoized), so it's safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, currentChainId, status, request]);

  // Clear user data when wallet disconnects
  useEffect(() => {
    if (status === "disconnected" && !address && user) {
      // Only clear if we had a user (prevents clearing on initial load)
      clearAllUserData();
    }
  }, [address, user, clearAllUserData, status]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      updateUser,
      updateUserSettings,
      logout,
      isAdmin,
      getCurrentUser,
      // Token balance and metadata
      platformTokenBalance: platformTokenBalanceData?.value,
      paymentTokenBalance: paymentTokenBalanceData?.value,
      platformTokenAddress,
      paymentTokenAddress,
      paymentTokenSymbol: paymentTokenSymbol as string | undefined,
      paymentTokenDecimals: paymentTokenDecimals as number | undefined,
      platformTokenSymbol: platformTokenSymbol as string | undefined,
      platformTokenDecimals: platformTokenDecimals as number | undefined,
      balancesLoading,
    }),
    [
      user,
      loading,
      updateUser,
      updateUserSettings,
      logout,
      isAdmin,
      getCurrentUser,
      platformTokenBalanceData?.value,
      paymentTokenBalanceData?.value,
      platformTokenAddress,
      paymentTokenAddress,
      paymentTokenSymbol,
      paymentTokenDecimals,
      platformTokenSymbol,
      platformTokenDecimals,
      balancesLoading,
    ]
  );

  return <PortoAuthContext.Provider value={contextValue}>{children}</PortoAuthContext.Provider>;
}
