import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

/** Hide overlay only after auth has been non-blocking this long (swallows Privy/wagmi `ready` / `address` flaps). */
const CLEAR_BLOCKING_DEBOUNCE_MS = 200;

interface AppLoadingGateState {
  isBlockingLoad: boolean;
  authLoading: boolean;
}

export function useAppLoadingGate(): AppLoadingGateState {
  const { loading: authLoading, user } = useAuth();

  // Global overlay: auth resolution only. Tournament metadata loads in the shell (header placeholder + route loaders).
  const rawBlocking = authLoading && !user;
  const [stableBlocking, setStableBlocking] = useState(rawBlocking);

  useEffect(() => {
    if (rawBlocking) {
      setStableBlocking(true);
      return;
    }
    const id = window.setTimeout(() => {
      setStableBlocking(false);
    }, CLEAR_BLOCKING_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [rawBlocking]);

  return useMemo(
    () => ({
      isBlockingLoad: stableBlocking,
      authLoading,
    }),
    [authLoading, stableBlocking],
  );
}
