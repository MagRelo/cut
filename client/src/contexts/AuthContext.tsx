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
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { usePostHog } from "posthog-js/react";
import { captureAccountFirstFunded, captureAuthSessionSynced } from "../lib/analytics/posthog";
import { ApiError, isApiError } from "../utils/apiError";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import { getContractAddress } from "../utils/blockchainUtils";
import { registerAuthTokenHandlers } from "../lib/authToken";
import { getTargetChainIdFromEnv } from "../config/targetChain";
import { clearStoredReferralCode, getStoredReferralCode } from "../lib/referralCapture";
import { preloadLineups } from "../lib/preloadData";

/** Thrown when a profile fetch finishes after logout or a 401 cleared the session cache. */
class SessionEndedError extends Error {
  constructor() {
    super("Session ended");
    this.name = "SessionEndedError";
  }
}

/** Membership + nested group as returned by GET /auth/me. */
export type AuthUserGroupMembership = {
  id: string;
  userId: string;
  userGroupId: string;
  role: string;
  joinedAt: string;
  userGroup: {
    id: string;
    name: string;
    description?: string | null;
  };
};

export interface AuthUser {
  id: string;
  name: string;
  userType: string;
  settings: Record<string, unknown> | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  userGroups: AuthUserGroupMembership[];
  chainId: number;
  walletAddress: string;
  referralCode: string | null;
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
  /** Re-fetch GET /auth/me (e.g. after join/leave league so `userGroups` stays current). */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  getCurrentUser: () => AuthUser | null;
  paymentTokenBalance: bigint | undefined;
  paymentTokenAddress: string | null;
  paymentTokenSymbol: string | undefined;
  paymentTokenDecimals: number | undefined;
  balancesLoading: boolean;
  /** True after a failed balance read while signed in (do not treat as $0). */
  balancesUnavailable: boolean;
  refetchBalances: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

function firstFundedStorageKey(userId: string): string {
  return `cut_ph_account_first_funded_${userId}`;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const { address, chainId: currentChainId, status } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  /** Sponsored smart-account txs debit ERC20s from the smart wallet, not always the wagmi EOA. */
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverSessionError, setServerSessionError] = useState<string | null>(null);
  /** Blocks the profile query until the next Privy login so a removed cache is not immediately refetched. */
  const [profileBlocked, setProfileBlocked] = useState(false);
  const profileBlockedRef = useRef(false);

  const blockProfile = useCallback(() => {
    profileBlockedRef.current = true;
    setProfileBlocked(true);
  }, []);

  const unblockProfile = useCallback(() => {
    profileBlockedRef.current = false;
    setProfileBlocked(false);
  }, []);

  const bootstrapAuthProfile = useCallback(async (targetChainId: number): Promise<AuthUser> => {
    if (profileBlockedRef.current) {
      throw new SessionEndedError();
    }

    const chainOptions = { requiresAuth: true as const, chainId: targetChainId };

    const loadProfile = async (): Promise<AuthUser> => {
      const profile = await apiClient.get<AuthUser>("/auth/me", chainOptions);
      if (!profile.walletAddress) {
        await apiClient.post("/auth/sync-wallets", undefined, chainOptions);
        return await apiClient.get<AuthUser>("/auth/me", chainOptions);
      }
      return profile;
    };

    const finish = (profile: AuthUser): AuthUser => {
      if (profileBlockedRef.current) {
        throw new SessionEndedError();
      }
      return profile;
    };

    try {
      return finish(await loadProfile());
    } catch (error) {
      if (error instanceof SessionEndedError) {
        throw error;
      }
      if (isApiError(error) && error.statusCode === 401 && error.code === "NEEDS_PROVISIONING") {
        const referralCode = getStoredReferralCode();
        const profile = await apiClient.post<AuthUser>("/auth/session", undefined, {
          ...chainOptions,
          headers: referralCode ? { "X-Cut-Referral-Code": referralCode } : undefined,
        });
        clearStoredReferralCode();
        return finish(profile);
      }
      if (
        isApiError(error) &&
        error.statusCode === 409 &&
        error.code === "WALLET_NOT_PROVISIONED_FOR_CHAIN"
      ) {
        await apiClient.post("/auth/sync-wallets", undefined, chainOptions);
        return finish(await loadProfile());
      }
      throw error;
    }
  }, []);

  const sessionEnabled = ready && authenticated && !!address && !profileBlocked;

  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => bootstrapAuthProfile(getTargetChainIdFromEnv()),
    enabled: sessionEnabled,
    retry: false,
    staleTime: Infinity,
  });

  const user: AuthUser | null = sessionEnabled ? (profileQuery.data ?? null) : null;
  const profilePending = sessionEnabled && profileQuery.isPending;

  const paymentTokenAddress = getContractAddress(currentChainId ?? 0, "paymentTokenAddress");

  const paymentBalanceEnabled = !!balanceAddress && !!paymentTokenAddress && !!user;

  const {
    data: paymentTokenBalanceData,
    isLoading: paymentBalanceLoading,
    isError: paymentBalanceIsError,
    refetch: refetchPaymentTokenBalance,
  } = useBalance({
    address: balanceAddress,
    token: paymentTokenAddress as `0x${string}`,
    query: {
      enabled: paymentBalanceEnabled,
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

  const balancesLoading = paymentBalanceLoading;

  const balancesUnavailable =
    paymentBalanceEnabled && !paymentBalanceLoading && paymentBalanceIsError;

  const refetchBalances = useCallback(async () => {
    await refetchPaymentTokenBalance();
  }, [refetchPaymentTokenBalance]);

  const combinedSpendableWei = useMemo(() => {
    return paymentTokenBalanceData?.value ?? 0n;
  }, [paymentTokenBalanceData?.value]);

  const combinedPrevRef = useRef<bigint | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !posthog) return;
    posthog.identify(user.id);
  }, [user?.id, posthog]);

  useEffect(() => {
    if (!user?.id || !posthog) return;
    captureAuthSessionSynced(posthog, {
      user_id: user.id,
      wallet_address: user.walletAddress,
    });
  }, [user?.id, user?.walletAddress, posthog]);

  useEffect(() => {
    if (!user?.id || !posthog || balancesLoading || balancesUnavailable) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(firstFundedStorageKey(user.id))) {
      combinedPrevRef.current = combinedSpendableWei;
      return;
    }
    const prev = combinedPrevRef.current;
    if (prev === null) {
      combinedPrevRef.current = combinedSpendableWei;
      return;
    }
    if (prev === 0n && combinedSpendableWei > 0n) {
      localStorage.setItem(firstFundedStorageKey(user.id), "1");
      captureAccountFirstFunded(posthog, {
        user_id: user.id,
        chain_id: user.chainId,
        payment_balance_wei: (paymentTokenBalanceData?.value ?? 0n).toString(),
      });
    }
    combinedPrevRef.current = combinedSpendableWei;
  }, [
    user?.id,
    user?.chainId,
    posthog,
    balancesLoading,
    balancesUnavailable,
    combinedSpendableWei,
    paymentTokenBalanceData?.value,
  ]);

  // Keep apiClient in sync with the Privy JWT and the wagmi chain for Authorization and X-Cut-Chain-Id.
  useEffect(() => {
    registerAuthTokenHandlers(
      () => getAccessToken(),
      () => (typeof currentChainId === "number" ? currentChainId : undefined),
    );
  }, [getAccessToken, currentChainId]);

  const forgetUnauthorizedProfile = useCallback(
    (error: unknown) => {
      if (isApiError(error) && error.statusCode === 401 && error.code !== "NEEDS_PROVISIONING") {
        blockProfile();
      }
    },
    [blockProfile],
  );

  const updateUser = useCallback(
    async (updatedUser: { name?: string }) => {
      try {
        const response = await apiClient.put<{ user: { id: string; name: string; userType: string } }>(
          "/auth/update",
          updatedUser,
          { requiresAuth: true },
        );
        queryClient.setQueryData<AuthUser | null>(queryKeys.user.profile(), (prev) =>
          prev ? { ...prev, name: response.user.name } : prev,
        );
      } catch (error) {
        forgetUnauthorizedProfile(error);
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user");
      }
    },
    [forgetUnauthorizedProfile, queryClient],
  );

  const updateUserSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      try {
        const response = await apiClient.put<{ settings: Record<string, unknown> }>(
          "/auth/settings",
          settings,
          { requiresAuth: true },
        );
        queryClient.setQueryData<AuthUser | null>(queryKeys.user.profile(), (prev) =>
          prev ? { ...prev, settings: response.settings } : prev,
        );
      } catch (error) {
        forgetUnauthorizedProfile(error);
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user settings");
      }
    },
    [forgetUnauthorizedProfile, queryClient],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: queryKeys.user.profile() });
  }, [queryClient]);

  const getCurrentUser = useCallback((): AuthUser | null => {
    return user;
  }, [user]);

  const isAdmin = useCallback(() => {
    const t = user?.userType;
    return Boolean(t === "ADMIN" || t === "SUPER_ADMIN");
  }, [user]);

  const flushAuthRelatedQueries = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: queryKeys.user.profile() });
    queryClient.removeQueries({ queryKey: queryKeys.user.profile() });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["lineups"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
    queryClient.removeQueries({ queryKey: ["lineups"] });
    queryClient.removeQueries({ queryKey: ["balance"] });
    queryClient.removeQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "user" &&
        query.queryKey[1] !== "profile",
    });
  }, [queryClient]);

  /** End Privy + wagmi without clearing `serverSessionError` (so Connect can show why signup failed). */
  const endPrivyAndWagmiSession = useCallback(async () => {
    blockProfile();
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
  }, [blockProfile, privyLogout, disconnect, flushAuthRelatedQueries]);

  const logout = useCallback(async () => {
    blockProfile();
    try {
      posthog?.reset();
    } catch {
      /* noop */
    }
    try {
      await privyLogout();
    } catch (e) {
      console.warn("Privy logout:", e);
    }
    setServerSessionError(null);
    flushAuthRelatedQueries();
    try {
      await disconnect();
    } catch (e) {
      console.warn("Wagmi disconnect:", e);
    }
  }, [blockProfile, privyLogout, flushAuthRelatedQueries, disconnect, posthog]);

  const clearLoginError = useCallback(() => {
    setLoginError(null);
    setServerSessionError(null);
  }, []);

  const { login } = useLogin({
    onComplete: () => {
      unblockProfile();
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

  useEffect(() => {
    if (!profileBlocked) return;
    void queryClient.cancelQueries({ queryKey: queryKeys.user.profile() });
    queryClient.removeQueries({ queryKey: queryKeys.user.profile() });
  }, [profileBlocked, queryClient]);

  useEffect(() => {
    const id = user?.id ?? null;
    if (!id) {
      syncedUserIdRef.current = null;
      return;
    }
    const previousUserId = syncedUserIdRef.current;
    if (previousUserId === id) return;
    const isInitialUserLoad = previousUserId === null;
    const userIdentityChanged = previousUserId !== null && previousUserId !== id;
    syncedUserIdRef.current = id;
    if (isInitialUserLoad || userIdentityChanged) {
      void queryClient.invalidateQueries({ queryKey: ["lineups"] });
      void queryClient.invalidateQueries({
        queryKey: ["user"],
        predicate: (query) => query.queryKey[1] !== "profile",
      });
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void preloadLineups(queryClient, id);
    }
  }, [user?.id, queryClient]);

  const reportedProfileError = useRef<unknown>(null);
  useEffect(() => {
    if (!profileQuery.isError) {
      reportedProfileError.current = null;
      if (sessionEnabled && profileQuery.data) {
        setServerSessionError(null);
      }
      return;
    }
    const error = profileQuery.error;
    if (reportedProfileError.current === error) return;
    reportedProfileError.current = error;
    if (error instanceof SessionEndedError) return;

    console.error("Auth profile bootstrap failed:", error);
    if (isApiError(error)) {
      if (error.statusCode === 401 && error.code !== "NEEDS_PROVISIONING") {
        setServerSessionError(null);
        blockProfile();
      } else {
        setServerSessionError(error.message);
        if (error.statusCode === 400 || error.statusCode === 403) {
          void endPrivyAndWagmiSession();
        }
      }
      return;
    }
    setServerSessionError("Could not connect to Play The Cut. Please try again.");
  }, [
    profileQuery.isError,
    profileQuery.error,
    profileQuery.data,
    sessionEnabled,
    blockProfile,
    endPrivyAndWagmiSession,
  ]);

  const hadSessionUserRef = useRef(false);
  useEffect(() => {
    if (user) hadSessionUserRef.current = true;
  }, [user]);

  // Wallet revoke while a Cut user is loaded: drop the profile and related caches.
  useEffect(() => {
    if (status === "disconnected" && !address && hadSessionUserRef.current) {
      hadSessionUserRef.current = false;
      setServerSessionError(null);
      flushAuthRelatedQueries();
    }
  }, [address, flushAuthRelatedQueries, status]);

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

  const loading = !ready || profilePending;

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      serverUserSyncing: profilePending,
      login,
      loginError,
      serverSessionError,
      clearLoginError,
      updateUser,
      updateUserSettings,
      refreshUser,
      logout,
      isAdmin,
      getCurrentUser,
      paymentTokenBalance: paymentTokenBalanceData?.value,
      paymentTokenAddress,
      paymentTokenSymbol: paymentTokenSymbol as string | undefined,
      paymentTokenDecimals: paymentTokenDecimals as number | undefined,
      balancesLoading,
      balancesUnavailable,
      refetchBalances,
    }),
    [
      user,
      loading,
      profilePending,
      login,
      loginError,
      serverSessionError,
      clearLoginError,
      updateUser,
      updateUserSettings,
      refreshUser,
      logout,
      isAdmin,
      getCurrentUser,
      paymentTokenBalanceData?.value,
      paymentTokenAddress,
      paymentTokenSymbol,
      paymentTokenDecimals,
      balancesLoading,
      balancesUnavailable,
      refetchBalances,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

const storybookAuthUser: AuthUser = {
  id: "user-storybook",
  name: "Storybook User",
  userType: "USER",
  settings: { color: "#3B82F6" },
  phone: null,
  email: "storybook@example.com",
  isVerified: true,
  userGroups: [],
  chainId: 84532,
  walletAddress: "0x0000000000000000000000000000000000000001",
  referralCode: "AbCdEf23",
};

const storybookAuthContextValue: AuthContextData = {
  user: storybookAuthUser,
  loading: false,
  serverUserSyncing: false,
  login: () => undefined,
  loginError: null,
  serverSessionError: null,
  clearLoginError: () => undefined,
  updateUser: async () => undefined,
  updateUserSettings: async () => undefined,
  refreshUser: async () => undefined,
  logout: async () => undefined,
  isAdmin: () => false,
  getCurrentUser: () => storybookAuthUser,
  paymentTokenBalance: BigInt(100) * BigInt(10 ** 6),
  paymentTokenAddress: null,
  paymentTokenSymbol: "xUSDC",
  paymentTokenDecimals: 6,
  balancesLoading: false,
  balancesUnavailable: false,
  refetchBalances: async () => undefined,
};

/** Storybook-only provider — shares the same context as `useAuth` (no Privy/wagmi). */
export function StorybookAuthProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: Partial<AuthContextData>;
}) {
  return (
    <AuthContext.Provider value={{ ...storybookAuthContextValue, ...value }}>
      {children}
    </AuthContext.Provider>
  );
}
