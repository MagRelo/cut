import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Connect } from "../components/user/Connect";
import { usePortoAuth } from "../contexts/PortoAuthContext";

export function ConnectPage() {
  const { user } = usePortoAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the return URL from location state, default to /account
  const returnLocation = (location.state as { from?: Location })?.from;
  const returnUrl = returnLocation
    ? `${returnLocation.pathname}${returnLocation.search}`
    : "/account";

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
    <div className="p-4">
      {/* logo from Home page */}
      {/* <div className="flex items-center justify-center gap-2 mt-2 mb-4">
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-12" />
        <h1 className="text-4xl font-bold text-black">
          the Cut
          <div className="text-lg font-bold text-gray-400 mb-1">Fantasy Golf</div>
        </h1>
      </div> */}

      <div>
        <h2 className="text-4xl font-bold text-gray-400 mb-6">Connect</h2>
      </div>

      <Connect onSuccess={handleConnectSuccess} />
    </div>
  );
}
