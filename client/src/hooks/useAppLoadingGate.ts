import { useAuth } from "../contexts/AuthContext";

interface AppLoadingGateState {
  isBlockingLoad: boolean;
  authLoading: boolean;
}

/** The wordmark stays up for one continuous `starting` stretch. */
export function useAppLoadingGate(): AppLoadingGateState {
  const { loading } = useAuth();

  return {
    isBlockingLoad: loading,
    authLoading: loading,
  };
}
