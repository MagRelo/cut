import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";
import { useReferralCodeDetected } from "../../hooks/useReferralCapture";

export function Connect() {
  const { access, loading, login, loginError, clearLoginError, logout, refreshUser } = useAuth();
  const referralCodeDetected = useReferralCodeDetected();

  const handleConnect = () => {
    clearLoginError();
    login();
  };

  if (access.kind === "starting" && access.authenticated) {
    return (
      <div className="flex flex-col items-center gap-4 font-display">
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-3 font-medium text-gray-400">
            <LoadingSpinnerSmall color={"green"} />
            Finishing sign-in
          </div>
        </div>
      </div>
    );
  }

  if (access.kind === "blocked") {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-4 font-display">
        <ErrorMessage className="text-center" message={access.message} />
        <Button type="button" block onClick={() => void refreshUser()}>
          Retry
        </Button>
        <Button type="button" block variant="neutral" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 font-display">
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        <div className="flex w-full flex-col gap-3">
          <Button type="button" block disabled={loading} onClick={handleConnect}>
            Sign in
          </Button>
          <button
            className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded border border-blue-500 bg-white px-4 font-display text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={handleConnect}
            type="button"
          >
            Create Account
          </button>
        </div>
        {referralCodeDetected && (
          <div
            className="flex w-full items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-2 font-display text-sm text-green-800"
            role="status"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-900"
              aria-hidden
            >
              ✓
            </span>
            <span>Referral link detected</span>
          </div>
        )}
      </div>
      {loginError ? <ErrorMessage className="max-w-xs text-center" message={loginError} /> : null}
    </div>
  );
}
