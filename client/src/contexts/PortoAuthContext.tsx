import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAccount, useSwitchChain, useDisconnect, useBalance, useReadContract, useConnectors } from "wagmi";
import { Hooks } from "porto/wagmi";
import { base, baseSepolia } from "wagmi/chains";
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
  authFlow: {
    phase: AuthFlowPhase;
    attemptId: number;
    error: string | null;
    isBusy: boolean;
  };
  startAuthFlow: (network: NetworkOption) => Promise<void>;
}

type NetworkOption = "mainnet" | "testnet";

type AuthFlowPhase =
  | "idle"
  | "disconnecting"
  | "wallet_connecting"
  | "server_auth_pending"
  | "chain_enforcing"
  | "ready"
  | "error";

interface AuthFlowState {
  phase: AuthFlowPhase;
  attemptId: number;
  error: string | null;
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
  const [connector] = useConnectors();
  const { mutate: connectWallet } = Hooks.useConnect();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PortoUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>({
    phase: "idle",
    attemptId: 0,
    error: null,
  });
  const initializingRef = useRef(false);
  const lastAddressRef = useRef<string | undefined>(undefined);
  const authAttemptRef = useRef(0);
  const authFlowRef = useRef<AuthFlowState>({
    phase: "idle",
    attemptId: 0,
    error: null,
  });

  const setAuthFlow = useCallback(
    (next: AuthFlowState | ((prev: AuthFlowState) => AuthFlowState)) => {
      setAuthFlowState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        authFlowRef.current = resolved;
        return resolved;
      });
    },
    []
  );

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

  const waitForDocumentFocus = useCallback(async (): Promise<void> => {
    if (document.hasFocus()) return;
    await new Promise<void>((resolve) => {
      const onFocus = () => resolve();
      window.addEventListener("focus", onFocus, { once: true });
    });
  }, []);

  const startAuthFlow = useCallback(
    async (network: NetworkOption) => {
      const nextAttemptId = authAttemptRef.current + 1;
      authAttemptRef.current = nextAttemptId;

      const isCurrentAttempt = () => authAttemptRef.current === nextAttemptId;
      const targetChainId = network === "mainnet" ? base.id : baseSepolia.id;

      setAuthFlow({
        phase: "disconnecting",
        attemptId: nextAttemptId,
        error: null,
      });

      setLoading(true);
      setUser(null);

      try {
        try {
          await disconnect();
        } catch (disconnectError) {
          console.warn("Auth flow disconnect failed:", disconnectError);
        }
        if (!isCurrentAttempt()) return;

        setAuthFlow((prev) => ({ ...prev, phase: "wallet_connecting" }));
        await waitForDocumentFocus();
        if (!isCurrentAttempt()) return;

        await new Promise<void>((resolve, reject) => {
          if (!connector) {
            reject(new Error("No wallet connector available"));
            return;
          }
          connectWallet(
            {
              connector,
              chainIds: [targetChainId],
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
        if (!isCurrentAttempt()) return;

        setAuthFlow((prev) => ({ ...prev, phase: "server_auth_pending" }));
        const response = await request<PortoUser>("GET", "/auth/me");
        if (!isCurrentAttempt()) return;
        setUser(response);

        setAuthFlow((prev) => ({ ...prev, phase: "chain_enforcing" }));
        if (typeof response.chainId === "number" && currentChainId !== response.chainId) {
          await waitForDocumentFocus();
          if (!isCurrentAttempt()) return;
          await switchChain({ chainId: response.chainId as 8453 | 84532 });
        }
        if (!isCurrentAttempt()) return;

        queryClient.invalidateQueries({ queryKey: ["lineups"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["balance"] });

        setAuthFlow((prev) => ({ ...prev, phase: "ready", error: null }));
      } catch (error) {
        if (!isCurrentAttempt()) return;
        const errorMessage = error instanceof Error ? error.message : "Authentication failed";
        console.error("Auth flow failed:", error);
        setAuthFlow((prev) => ({ ...prev, phase: "error", error: errorMessage }));
      } finally {
        if (isCurrentAttempt()) {
          setLoading(false);
        }
      }
    },
    [
      connectWallet,
      connector,
      currentChainId,
      disconnect,
      queryClient,
      request,
      setAuthFlow,
      switchChain,
      waitForDocumentFocus,
    ]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      const phase = authFlowRef.current.phase;
      const isFlowBusy =
        phase === "disconnecting" ||
        phase === "wallet_connecting" ||
        phase === "server_auth_pending" ||
        phase === "chain_enforcing";

      // The state machine owns auth changes while an explicit flow is in progress.
      if (isFlowBusy) {
        return;
      }

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

    // Add a small delay to prevent immediate auth checks during wallet connection
    // This helps avoid conflicts with the wallet connection process
    const timeoutId = setTimeout(() => {
      initializeAuth();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [address, status, request, queryClient]);

  // Clear user data when wallet disconnects
  useEffect(() => {
    if (status === "disconnected" && !address && user) {
      // Only clear if we had a user (prevents clearing on initial load)
      clearAllUserData();
    }
  }, [address, user, clearAllUserData, status]);

  useEffect(() => {
    if (!user) return;
    if (status !== "connected") return;
    if (typeof currentChainId !== "number") return;
    if (currentChainId === user.chainId) return;

    const phase = authFlowRef.current.phase;
    if (phase === "wallet_connecting" || phase === "server_auth_pending") return;

    const run = async () => {
      const latestPhase = authFlowRef.current.phase;
      if (latestPhase === "wallet_connecting" || latestPhase === "server_auth_pending") return;

      if (!document.hasFocus()) return;
      try {
        await switchChain({ chainId: user.chainId as 8453 | 84532 });
      } catch (switchError) {
        console.warn("Failed to switch chain to user.chainId:", switchError);
      }
    };

    run();
  }, [user, status, currentChainId, switchChain]);

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
      authFlow: {
        phase: authFlowState.phase,
        attemptId: authFlowState.attemptId,
        error: authFlowState.error,
        isBusy:
          authFlowState.phase === "disconnecting" ||
          authFlowState.phase === "wallet_connecting" ||
          authFlowState.phase === "server_auth_pending" ||
          authFlowState.phase === "chain_enforcing",
      },
      startAuthFlow,
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
      authFlowState.phase,
      authFlowState.attemptId,
      authFlowState.error,
      startAuthFlow,
    ]
  );

  return <PortoAuthContext.Provider value={contextValue}>{children}</PortoAuthContext.Provider>;
}
