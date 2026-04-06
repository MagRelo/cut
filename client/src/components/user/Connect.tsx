import { useEffect, useRef } from "react";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";

interface ConnectProps {
  onSuccess?: () => void;
}

export function Connect({ onSuccess }: ConnectProps = {}) {
  const {
    user,
    loading,
    login,
    loginError,
    serverSessionError,
    clearLoginError,
    serverUserSyncing,
  } = useAuth();
  const successTriggeredRef = useRef(false);

  const isSyncingServer = serverUserSyncing && !user;

  useEffect(() => {
    if (!user) {
      successTriggeredRef.current = false;
      return;
    }
    if (successTriggeredRef.current) return;
    successTriggeredRef.current = true;
    onSuccess?.();
  }, [user, onSuccess]);

  const handleConnect = () => {
    clearLoginError();
    login();
  };

  return (
    <div className="flex flex-col items-center gap-4 font-display">
      {isSyncingServer ? (
        <div className="p-8 text-center">
          <div className="flex items-center gap-3 justify-center text-gray-400 font-medium">
            <LoadingSpinnerSmall color={"green"} />
            Connecting to the Cut...
          </div>
        </div>
      ) : (
        <button
          className="w-40 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md text-lg"
          disabled={loading}
          onClick={handleConnect}
          type="button"
        >
          Sign in
        </button>
      )}

      {(loginError || serverSessionError) && (
        <div className="max-w-xs px-6 py-4 bg-red-50 border border-red-300 rounded-sm">
          <p className="text-sm text-red-700 text-center whitespace-pre-line">
            {serverSessionError || loginError}
          </p>
        </div>
      )}
    </div>
  );
}
