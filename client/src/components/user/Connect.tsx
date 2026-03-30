import { useEffect, useRef } from "react";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";

interface ConnectProps {
  onSuccess?: () => void;
}

export function Connect({ onSuccess }: ConnectProps = {}) {
  const { user, loading, login, loginError, clearLoginError, serverUserSyncing } = useAuth();
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
    <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
      {isSyncingServer ? (
        <div className="p-8 text-center">
          <div className="flex items-center gap-3 justify-center text-gray-400 font-medium font-display">
            <LoadingSpinnerSmall color={"green"} />
            Connecting to the Cut...
          </div>
        </div>
      ) : (
        <div>
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div
                className="flex items-center gap-3 justify-center"
                style={{ marginLeft: "-20px" }}
              >
                <img src="/logo-transparent.png" alt="Cut Logo" className="h-16" />
                <div className="text-left">
                  <h1 className="text-4xl font-bold text-black font-display">the Cut</h1>
                  <div className="text-lg font-bold text-gray-400 font-display">Fantasy Golf</div>
                </div>
              </div>
            </div>

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md text-lg"
              disabled={loading}
              onClick={handleConnect}
              type="button"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {loginError && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600 text-center">{loginError}</p>
        </div>
      )}
    </div>
  );
}
