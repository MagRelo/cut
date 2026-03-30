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
import { usePrivy } from "@privy-io/react-auth";
import { base, baseSepolia } from "wagmi/chains";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { handleApiResponse, ApiError } from "../utils/apiError";
import { getContractAddress } from "../utils/blockchainUtils";
import { registerAuthTokenHandlers } from "../lib/authToken";

export interface AuthUser {
  id: string;
  name: string;
  userType: string;
  settings: Record<string, unknown> | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  userGroups: Array<unknown>;
  tournamentLineups?: unknown[];
  chainId: number;
  walletAddress: string;
  pendingTokenMint?: boolean;
  createdAt?: string;
}

interface AuthContextData {
  user: AuthUser | null;
  loading: boolean;
  updateUser: (updatedUser: { name?: string }) => Promise<void>;
  updateUserSettings: (settings: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  getCurrentUser: () => AuthUser | null;
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

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId: currentChainId, status } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { ready, authenticated, login, logout: privyLogout, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
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
    [],
  );

  const platformTokenAddress = getContractAddress(currentChainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(currentChainId ?? 0, "paymentTokenAddress");

  const { data: platformTokenBalanceData, isLoading: platformBalanceLoading } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
    query: {
      enabled: !!address && !!platformTokenAddress && !!user,
      refetchInterval: user ? 30000 : false,
    },
  });

  const { data: paymentTokenBalanceData, isLoading: paymentBalanceLoading } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
    query: {
      enabled: !!address && !!paymentTokenAddress && !!user,
      refetchInterval: user ? 30000 : false,
    },
  });

  const { data: paymentTokenSymbol } = useReadContract({
    address: paymentTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: !!paymentTokenAddress,
      staleTime: Infinity,
    },
  });

  const { data: paymentTokenDecimals } = useReadContract({
    address: paymentTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!paymentTokenAddress,
      staleTime: Infinity,
    },
  });

  const { data: platformTokenSymbol } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: !!platformTokenAddress,
      staleTime: Infinity,
    },
  });

  const { data: platformTokenDecimals } = useReadContract({
    address: platformTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!platformTokenAddress,
      staleTime: Infinity,
    },
  });

  const balancesLoading = platformBalanceLoading || paymentBalanceLoading;

  useEffect(() => {
    registerAuthTokenHandlers(
      () => getAccessToken(),
      () => (typeof currentChainId === "number" ? currentChainId : undefined),
    );
  }, [getAccessToken, currentChainId]);

  const config = useMemo(
    () => ({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
      headers: {
        "Content-Type": "application/json",
      },
    }),
    [],
  );

  const request = useCallback(
    async <T,>(
      method: string,
      endpoint: string,
      data?: unknown,
      chainOverride?: number,
    ): Promise<T> => {
      const token = await getAccessToken();
      if (!token) {
        throw new ApiError(401, "Not authenticated");
      }
      const headers: Record<string, string> = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
      const cid = chainOverride ?? currentChainId;
      if (typeof cid === "number") {
        headers["X-Cut-Chain-Id"] = String(cid);
      }

      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "omit",
      });

      try {
        return await handleApiResponse<T>(response);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          setUser(null);
        }
        throw error;
      }
    },
    [config, getAccessToken, currentChainId],
  );

  const updateUser = useCallback(
    async (updatedUser: { name?: string }) => {
      try {
        const response = await request<{ user: { id: string; name: string; userType: string } }>(
          "PUT",
          "/auth/update",
          updatedUser,
        );
        setUser((prev) => (prev ? { ...prev, name: response.user.name } : null));
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user");
      }
    },
    [request],
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
    [request],
  );

  const getCurrentUser = useCallback((): AuthUser | null => {
    return user;
  }, [user]);

  const isAdmin = useCallback(() => {
    return Boolean(user?.userType === "ADMIN");
  }, [user]);

  const clearLocalCache = useCallback(() => {
    setUser(null);
    queryClient.invalidateQueries({ queryKey: ["auth"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["lineups"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["user"] });
    queryClient.removeQueries({ queryKey: ["lineups"] });
    queryClient.removeQueries({ queryKey: ["balance"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await privyLogout();
    } catch (e) {
      console.warn("Privy logout:", e);
    }
    clearLocalCache();
    try {
      await disconnect();
    } catch (e) {
      console.warn("Wagmi disconnect:", e);
    }
  }, [privyLogout, clearLocalCache, disconnect]);

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
        try {
          await privyLogout();
        } catch (e) {
          console.warn("Privy logout before login:", e);
        }
        if (!isCurrentAttempt()) return;

        setAuthFlow((prev) => ({ ...prev, phase: "wallet_connecting" }));
        await waitForDocumentFocus();
        if (!isCurrentAttempt()) return;

        await login();
        if (!isCurrentAttempt()) return;

        setAuthFlow((prev) => ({ ...prev, phase: "chain_enforcing" }));
        await waitForDocumentFocus();
        if (!isCurrentAttempt()) return;

        try {
          await switchChain({ chainId: targetChainId });
        } catch (switchErr) {
          console.warn("switchChain in auth flow:", switchErr);
        }
        if (!isCurrentAttempt()) return;

        setAuthFlow((prev) => ({ ...prev, phase: "server_auth_pending" }));
        const response = await request<AuthUser>("GET", "/auth/me", undefined, targetChainId);
        if (!isCurrentAttempt()) return;
        setUser(response);

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
    [disconnect, privyLogout, login, queryClient, request, setAuthFlow, switchChain, waitForDocumentFocus],
  );

  useEffect(() => {
    const initializeAuth = async () => {
      const phase = authFlowRef.current.phase;
      const isFlowBusy =
        phase === "disconnecting" ||
        phase === "wallet_connecting" ||
        phase === "server_auth_pending" ||
        phase === "chain_enforcing";

      if (isFlowBusy) {
        return;
      }

      if (!ready) {
        return;
      }

      if (!authenticated) {
        setUser(null);
        setLoading(false);
        lastAddressRef.current = undefined;
        return;
      }

      if (initializingRef.current) {
        return;
      }

      if (address === lastAddressRef.current) {
        return;
      }

      if (!address) {
        setUser(null);
        setLoading(false);
        lastAddressRef.current = undefined;
        return;
      }

      if (initializingRef.current && lastAddressRef.current === address) {
        return;
      }

      initializingRef.current = true;
      lastAddressRef.current = address;

      try {
        setLoading(true);
        const response = await request<AuthUser>("GET", "/auth/me");
        setUser(response);
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
        }
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    };

    const timeoutId = setTimeout(() => {
      initializeAuth();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [address, status, request, queryClient, ready, authenticated]);

  useEffect(() => {
    if (status === "disconnected" && !address && user) {
      clearLocalCache();
    }
  }, [address, user, clearLocalCache, status]);

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

  const effectiveLoading = loading || !ready;

  const contextValue = useMemo(
    () => ({
      user,
      loading: effectiveLoading,
      updateUser,
      updateUserSettings,
      logout,
      isAdmin,
      getCurrentUser,
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
      effectiveLoading,
      ready,
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
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
