import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Connect } from "../components/user/Connect";
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
    <div className="flex-1 w-full flex flex-col items-center  pt-8 pb-8">
      <div>
        {/* Title and Logo */}
        <div className="flex items-center gap-3 pb-2" style={{ marginLeft: "-24px" }}>
          <img src="/logo-transparent.png" alt="Cut Logo" className="h-32" />

          <h1 className="text-6xl font-bold text-black">
            the Cut
            <div className="text-2xl font-bold text-gray-400">Fantasy Golf + </div>
            <div className="text-2xl font-bold text-gray-400">Prediction Market</div>
          </h1>
        </div>
      </div>

      <div className="mt-4">
        <Connect onSuccess={handleConnectSuccess} />
      </div>
    </div>
  );
}
