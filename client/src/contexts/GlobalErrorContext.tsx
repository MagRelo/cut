import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GlobalErrorOverlay } from "../components/common/GlobalErrorOverlay";

export interface GlobalErrorDetails {
  id?: string;
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

interface GlobalErrorContextValue {
  error: GlobalErrorDetails | null;
  showError: (details: GlobalErrorDetails) => void;
  clearError: (id?: string) => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextValue | undefined>(undefined);

export const GlobalErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<GlobalErrorDetails | null>(null);

  const showError = useCallback((details: GlobalErrorDetails) => {
    setError(details);
  }, []);

  const clearError = useCallback((id?: string) => {
    setError((current) => {
      if (!current) return null;
      if (!id || current.id === id) {
        return null;
      }
      return current;
    });
  }, []);

  const value = useMemo(
    () => ({
      error,
      showError,
      clearError,
    }),
    [error, showError, clearError]
  );

  return (
    <GlobalErrorContext.Provider value={value}>
      {children}
      <GlobalErrorOverlay error={error} />
    </GlobalErrorContext.Provider>
  );
};

export function useGlobalError(): GlobalErrorContextValue {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error("useGlobalError must be used within a GlobalErrorProvider");
  }
  return context;
}
