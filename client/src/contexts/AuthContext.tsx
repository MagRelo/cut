import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useAccount, useSwitchChain, useDisconnect, useBalance, useReadContract } from "wagmi";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { ApiError, handleApiResponse, isApiError } from "../utils/apiError";
import { getContractAddress } from "../utils/blockchainUtils";
import { registerAuthTokenHandlers } from "../lib/authToken";
import { getTargetChainIdFromEnv } from "../config/targetChain";
import { clearStoredReferrerAddress, getStoredReferrerAddress } from "../lib/referralCapture";

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
  /** Privy not ready, or loading server user from `/auth/me`. */
  loading: boolean;
  /** True while fetching `/auth/me` (after Privy session exists). */
  serverUserSyncing: boolean;
  /** Opens Privy login (see `useLogin` in Privy docs). */
  login: () => void;
  loginError: string | null;
  /** Shown when Privy login succeeded but `/auth/me` failed (e.g. referral required). */
  serverSessionError: string | null;
  clearLoginError: () => void;
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
  const { client: smartWalletClient } = useSmartWallets();
  /** Sponsored smart-account txs debit ERC20s from the smart wallet, not always the wagmi EOA. */
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userSyncLoading, setUserSyncLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverSessionError, setServerSessionError] = useState<string | null>(null);

  const platformTokenAddress = getContractAddress(currentChainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(currentChainId ?? 0, "paymentTokenAddress");

  const { data: platformTokenBalanceData, isLoading: platformBalanceLoading } = useBalance({
    address: balanceAddress,
    token: platformTokenAddress as `0x${string}`,
    query: {
      enabled: !!balanceAddress && !!platformTokenAddress && !!user,
      refetchInterval: user ? 30000 : false,
    },
  });

  const { data: paymentTokenBalanceData, isLoading: paymentBalanceLoading } = useBalance({
    address: balanceAddress,
    token: paymentTokenAddress as `0x${string}`,
    query: {
      enabled: !!balanceAddress && !!paymentTokenAddress && !!user,
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

  // Keep apiClient / non-React fetch helpers in sync with Privy JWT + wagmi chain for Authorization and X-Cut-Chain-Id.
  // Necessary if anything outside this tree calls those helpers; remove only if all API calls go through `request` here.
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
      const referrer = getStoredReferrerAddress();
      if (referrer) {
        headers["X-Cut-Referrer-Address"] = referrer;
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

  const flushAuthRelatedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["auth"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["lineups"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["user"] });
    queryClient.removeQueries({ queryKey: ["lineups"] });
    queryClient.removeQueries({ queryKey: ["balance"] });
  }, [queryClient]);

  const clearLocalCache = useCallback(() => {
    setUser(null);
    setServerSessionError(null);
    flushAuthRelatedQueries();
  }, [flushAuthRelatedQueries]);

  /** End Privy + wagmi without clearing `serverSessionError` (so Connect can show why signup failed). */
  const endPrivyAndWagmiSession = useCallback(async () => {
    try {
      await privyLogout();
    } catch (e) {
      console.warn("Privy logout:", e);
    }
    try {
      await disconnect();
    } catch (e) {
      console.warn("Wagmi disconnect:", e);
    }
    flushAuthRelatedQueries();
  }, [privyLogout, disconnect, flushAuthRelatedQueries]);

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

  const clearLoginError = useCallback(() => {
    setLoginError(null);
    setServerSessionError(null);
  }, []);

  const { login } = useLogin({
    onComplete: () => {
      setLoginError(null);
      setServerSessionError(null);
      const targetChainId = getTargetChainIdFromEnv();
      void (async () => {
        try {
          await switchChain({ chainId: targetChainId });
        } catch (e) {
          console.warn("switchChain after login:", e);
        }
      })();
    },
    onError: (error) => {
      setLoginError(`Login failed (${String(error)})`);
    },
  });

  // Core: load Cut `user` from GET /auth/me whenever Privy is ready, the user is authenticated, and we have a wallet address.
  // Refetches when `address` changes (new wallet) or `request` identity changes (e.g. chain). Safe to drop only if you move this to React Query / router loader.
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setUser(null);
      setUserSyncLoading(false);
      return;
    }

    if (!address) {
      setUser(null);
      setUserSyncLoading(false);
      return;
    }

    let cancelled = false;
    setUserSyncLoading(true);

    const targetChainId = getTargetChainIdFromEnv();

    void (async () => {
      try {
        const response = await request<AuthUser>("GET", "/auth/me", undefined, targetChainId);
        if (!cancelled) {
          setServerSessionError(null);
          clearStoredReferrerAddress();
          setUser(response);
          queryClient.invalidateQueries({ queryKey: ["lineups"] });
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["balance"] });
        }
      } catch (error) {
        console.error("GET /auth/me failed:", error);
        if (!cancelled) {
          setUser(null);
          if (isApiError(error)) {
            if (error.statusCode === 401) {
              setServerSessionError(null);
            } else {
              let msg = error.message;
              if (error.code === "REFERRER_REQUIRED") {
                msg +=
                  "\n\nUse an invite link from a friend then refresh the page and sign in again.";
              }
              setServerSessionError(msg);
              if (error.statusCode === 400 || error.statusCode === 403) {
                void endPrivyAndWagmiSession();
              }
            }
          } else {
            setServerSessionError("Could not connect to Cut. Please try again.");
          }
        }
      } finally {
        if (!cancelled) setUserSyncLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setUserSyncLoading(false);
    };
  }, [ready, authenticated, address, request, queryClient, endPrivyAndWagmiSession]);

  // Wagmi can disconnect (e.g. wallet revoke) while React still holds `user`; clear local server user + RQ caches so UI matches wallet.
  // Could be merged into the effect above if you prefer a single “auth state” effect, but keep if you want an explicit wallet-disconnect edge.
  useEffect(() => {
    if (status === "disconnected" && !address && user) {
      clearLocalCache();
    }
  }, [address, user, clearLocalCache, status]);

  // If the wallet is on the wrong chain vs `user.chainId` (e.g. user switched network in the wallet app), nudge back to the chain the server expects.
  // Optional UX polish; remove if you handle chain mismatch only in transaction flows or don’t auto-switch.
  useEffect(() => {
    if (!user) return;
    if (status !== "connected") return;
    if (typeof currentChainId !== "number") return;
    if (currentChainId === user.chainId) return;

    const run = async () => {
      if (!document.hasFocus()) return;
      try {
        await switchChain({ chainId: user.chainId as 8453 | 84532 });
      } catch (switchError) {
        console.warn("Failed to switch chain to user.chainId:", switchError);
      }
    };

    void run();
  }, [user, status, currentChainId, switchChain]);

  const loading = !ready || userSyncLoading;

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      serverUserSyncing: userSyncLoading,
      login,
      loginError,
      serverSessionError,
      clearLoginError,
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
    }),
    [
      user,
      loading,
      userSyncLoading,
      login,
      loginError,
      serverSessionError,
      clearLoginError,
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
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
