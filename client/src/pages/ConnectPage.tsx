import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Connect } from "../components/user/Connect";
import { BRAND_PROSE, BRAND_WORDMARK } from "../lib/brand";
import { useAuth } from "../contexts/AuthContext";

export function ConnectPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the return URL from location state, default to /contests (soft landing after sign-in)
  const returnLocation = (location.state as { from?: Location })?.from;
  const returnUrl = returnLocation
    ? `${returnLocation.pathname}${returnLocation.search}`
    : "/contests";

  // Redirect if already connected
  if (user) {
    return <Navigate to={returnUrl} replace />;
  }

  const handleConnectSuccess = () => {
    // Small delay to show success state, then redirect back to where they came from
    setTimeout(() => {
      navigate(returnUrl, { replace: true });
    }, 1000);
  };

  return (
    <div className="flex w-full flex-1 flex-col items-center px-6 py-10 sm:py-14">
      <div className="mb-8 flex flex-col items-center gap-3 sm:mb-10 sm:gap-4">
        <img
          src="/logo-transparent.png"
          alt={`${BRAND_PROSE} logo`}
          className="h-16 w-auto sm:h-20"
        />
        <h1 className="text-center font-display text-3xl uppercase tracking-widest text-slate-900 sm:text-4xl md:text-5xl">
          {BRAND_WORDMARK}
        </h1>
      </div>

      <Connect onSuccess={handleConnectSuccess} />
    </div>
  );
}
