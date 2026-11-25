import { Navigate, useLocation } from "react-router-dom";

import { Connect } from "../components/auth/Connect";
import { BrandLogo } from "../components/common/BrandLogo";
import { BRAND_WORDMARK } from "../lib/brand";
import { useAuth } from "../contexts/AuthContext";

export function ConnectPage() {
  const { user } = useAuth();
  const location = useLocation();

  const returnLocation = (location.state as { from?: Location } | null)?.from;
  const returnUrl = returnLocation
    ? `${returnLocation.pathname}${returnLocation.search}`
    : "/contests";

  if (user) {
    return <Navigate to={returnUrl} replace />;
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center px-6 py-10 sm:py-14">
      <div className="w-full max-w-xl rounded-md border border-slate-300 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="mb-8 flex flex-col items-center gap-3 sm:mb-10 sm:gap-4">
          <BrandLogo decorative={false} className="h-16 w-auto sm:h-20" />
          <h1 className="text-center font-display text-3xl uppercase tracking-widest text-slate-900 sm:text-4xl md:text-5xl">
            {BRAND_WORDMARK}
          </h1>
        </div>

        <Connect />
      </div>
    </div>
  );
}
