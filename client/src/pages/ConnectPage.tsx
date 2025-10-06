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
      <Connect onSuccess={handleConnectSuccess} />
    </div>
  );
}
