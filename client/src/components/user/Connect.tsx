import { useEffect, useRef } from "react";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";
import { useReferralCodeDetected } from "../../hooks/useReferralCapture";

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
  const referralCodeDetected = useReferralCodeDetected();
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
        <div className="flex w-full max-w-xs flex-col gap-4 items-center">
          <div className="flex w-48 flex-col gap-4 items-stretch">
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-display font-semibold py-2.5 px-4 rounded-sm border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              disabled={loading}
              onClick={handleConnect}
              type="button"
            >
              Sign in
            </button>
            <hr className="border-0 border-t border-gray-200" />
            <button
              className="w-full bg-white hover:bg-blue-50 text-blue-600 font-display font-semibold py-2.5 px-4 rounded-sm border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              disabled={loading}
              onClick={handleConnect}
              type="button"
            >
              Create Account
            </button>
          </div>
          {referralCodeDetected && (
            <div
              className="flex w-full items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 font-display"
              role="status"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-900 text-xs font-bold"
                aria-hidden
              >
                ✓
              </span>
              <span>Referral link detected</span>
            </div>
          )}
        </div>
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
