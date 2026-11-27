import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAccount, useSwitchChain, useDisconnect } from "wagmi";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaymentTokenBalance, usePaymentTokenMetadata } from "../chain/usePaymentTokenBalance";
import { usePostHog } from "posthog-js/react";
import { captureAccountFirstFunded, captureAuthSessionSynced } from "../lib/analytics/posthog";
import { ApiError, apiErrorMessage, isApiError } from "../utils/apiError";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import { getContractAddress } from "../utils/blockchainUtils";
import { registerAuthTokenHandlers } from "../lib/authToken";
import { getTargetChainIdFromEnv } from "../config/targetChain";
import { clearStoredReferralCode, getStoredReferralCode } from "../lib/referralCapture";
import { preloadLineups } from "../lib/preloadData";
import { readAccess, type Access } from "../lib/access";

const ACCOUNT_OPEN_ERROR = "Could not connect to Play The Cut. Please try again.";

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
  walletOwner: string | null;
  pendingOwner: string | null;
  referralCode: string | null;
  pendingTokenMint?: boolean;
  createdAt?: string;
}

interface AuthContextData {
  access: Access<AuthUser>;
  user: AuthUser | null;
  /** True while access is `starting`. */
  loading: boolean;
  /** Opens Privy login (see `useLogin` in Privy docs). */
  login: () => void;
  loginError: string | null;
  clearLoginError: () => void;
  updateUser: (updatedUser: { name?: string }) => Promise<void>;
  updateUserSettings: (settings: Record<string, unknown>) => Promise<void>;
  /** Re-fetch GET /auth/me (e.g. after join/leave league so `userGroups` stays current). */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
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
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);

  const bootstrapAuthProfile = useCallback(async (targetChainId: number): Promise<AuthUser> => {
    const chainOptions = { requiresAuth: true as const, chainId: targetChainId };

    const loadProfile = async (): Promise<AuthUser> => {
      const profile = await apiClient.get<AuthUser>("/auth/me", chainOptions);
      if (!profile.walletAddress) {
        await apiClient.post("/auth/sync-wallets", undefined, chainOptions);
        return await apiClient.get<AuthUser>("/auth/me", chainOptions);
      }
      return profile;
    };

    try {
      return await loadProfile();
    } catch (error) {
      if (isApiError(error) && error.statusCode === 401 && error.code === "NEEDS_PROVISIONING") {
        const referralCode = getStoredReferralCode();
        const profile = await apiClient.post<AuthUser>("/auth/session", undefined, {
          ...chainOptions,
          headers: referralCode ? { "X-Cut-Referral-Code": referralCode } : undefined,
        });
        clearStoredReferralCode();
        return profile;
      }
      if (
        isApiError(error) &&
        error.statusCode === 409 &&
        error.code === "WALLET_NOT_PROVISIONED_FOR_CHAIN"
      ) {
        await apiClient.post("/auth/sync-wallets", undefined, chainOptions);
        return await loadProfile();
      }
      throw error;
    }
  }, []);

  const walletAddress = smartWalletClient?.account?.address ?? address ?? null;
  const sessionEnabled = ready && authenticated && !!walletAddress;

  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => bootstrapAuthProfile(getTargetChainIdFromEnv()),
    enabled: sessionEnabled,
    retry: false,
    staleTime: Infinity,
  });

  const access = readAccess({
    privyReady: ready,
    authenticated,
    walletAddress,
    account: profileQuery.data,
    accountPending: sessionEnabled && profileQuery.isPending,
    accountError:
      sessionEnabled && profileQuery.isError && profileQuery.data == null
        ? apiErrorMessage(profileQuery.error, ACCOUNT_OPEN_ERROR)
        : null,
  });
  const loading = access.kind === "starting";
  const user: AuthUser | null = access.kind === "account" ? access.account : null;

  const paymentTokenAddress = getContractAddress(currentChainId ?? 0, "paymentTokenAddress");
  const balanceAddress = (user?.walletAddress ??
    smartWalletClient?.account?.address ??
    address) as `0x${string}` | undefined;

  const paymentBalanceEnabled = !!balanceAddress && !!paymentTokenAddress && !!user;

  const {
    value: paymentTokenBalanceValue,
    isLoading: paymentBalanceLoading,
    isError: paymentBalanceIsError,
    refetch: refetchPaymentTokenBalance,
  } = usePaymentTokenBalance({
    address: balanceAddress,
    token: paymentTokenAddress,
    chainId: currentChainId,
    enabled: paymentBalanceEnabled,
  });

  const { symbol: paymentTokenSymbol, decimals: paymentTokenDecimals } = usePaymentTokenMetadata({
    token: paymentTokenAddress,
    chainId: currentChainId,
  });

  const balancesLoading = paymentBalanceLoading;

  const balancesUnavailable =
    paymentBalanceEnabled && !paymentBalanceLoading && paymentBalanceIsError;

  const refetchBalances = useCallback(async () => {
    await refetchPaymentTokenBalance();
  }, [refetchPaymentTokenBalance]);

  const combinedSpendableWei = useMemo(() => {
    return paymentTokenBalanceValue ?? 0n;
  }, [paymentTokenBalanceValue]);

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
        payment_balance_wei: (paymentTokenBalanceValue ?? 0n).toString(),
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
    paymentTokenBalanceValue,
  ]);

  // Keep apiClient in sync with the Privy JWT and the wagmi chain for Authorization and X-Cut-Chain-Id.
  useEffect(() => {
    registerAuthTokenHandlers(
      () => getAccessToken(),
      () => (typeof currentChainId === "number" ? currentChainId : undefined),
    );
  }, [getAccessToken, currentChainId]);

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
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user");
      }
    },
    [queryClient],
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
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "Failed to update user settings");
      }
    },
    [queryClient],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: queryKeys.user.profile() });
  }, [queryClient]);

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
    queryClient.removeQueries({ queryKey: ["userGroups"] });
    queryClient.removeQueries({ queryKey: ["bot-delegates"] });
    queryClient.removeQueries({ queryKey: ["stream"] });
    queryClient.removeQueries({ queryKey: [...queryKeys.contests.all, "lobby"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      posthog?.reset();
    } catch {
      /* noop */
    }
    await queryClient.cancelQueries({ queryKey: queryKeys.user.profile() });
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
  }, [disconnect, flushAuthRelatedQueries, posthog, privyLogout, queryClient]);

  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  const { login } = useLogin({
    onComplete: () => {
      setLoginError(null);
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
    if (userIdentityChanged) {
      queryClient.removeQueries({ queryKey: ["userGroups"] });
      queryClient.removeQueries({ queryKey: ["bot-delegates"] });
      queryClient.removeQueries({ queryKey: ["stream"] });
      queryClient.removeQueries({ queryKey: [...queryKeys.contests.all, "lobby"] });
      queryClient.removeQueries({ queryKey: [...queryKeys.user.all, "transactions"] });
    }
  }, [user?.id, queryClient]);

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

  const contextValue = useMemo(
    () => ({
      access,
      user,
      loading,
      login,
      loginError,
      clearLoginError,
      updateUser,
      updateUserSettings,
      refreshUser,
      logout,
      isAdmin,
      paymentTokenBalance: paymentTokenBalanceValue,
      paymentTokenAddress,
      paymentTokenSymbol,
      paymentTokenDecimals,
      balancesLoading,
      balancesUnavailable,
      refetchBalances,
    }),
    [
      access,
      user,
      loading,
      login,
      loginError,
      clearLoginError,
      updateUser,
      updateUserSettings,
      refreshUser,
      logout,
      isAdmin,
      paymentTokenBalanceValue,
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
  walletOwner: null,
  pendingOwner: null,
  referralCode: "AbCdEf23",
};

const storybookAuthContextValue: AuthContextData = {
  access: { kind: "account", account: storybookAuthUser },
  user: storybookAuthUser,
  loading: false,
  login: () => undefined,
  loginError: null,
  clearLoginError: () => undefined,
  updateUser: async () => undefined,
  updateUserSettings: async () => undefined,
  refreshUser: async () => undefined,
  logout: async () => undefined,
  isAdmin: () => false,
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
