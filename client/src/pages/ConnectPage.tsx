import { useState, useEffect } from "react";
import { useConnectors, useDisconnect } from "wagmi";
import { Hooks } from "porto/wagmi";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { LoadingSpinnerSmall } from "../components/common/LoadingSpinnerSmall";
import { usePortoAuth } from "../contexts/PortoAuthContext";

enum ConnectionStatus {
  IDLE = "idle",
  CONNECTING_WALLET = "connecting_wallet",
  CONNECTING_TO_CUT = "connecting_to_cut",
  SUCCESS = "success",
  ERROR = "error",
}

export function ConnectPage() {
  const [connector] = useConnectors();
  const { mutate: connect, error } = Hooks.useConnect();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [tocAccepted, setTocAccepted] = useState(false);
  const { disconnect } = useDisconnect();
  const { user } = usePortoAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the return URL from location state, default to /account
  const returnUrl = (location.state as any)?.from?.pathname || "/account";

  // Helper function to get status display text
  const getStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING_WALLET:
        return "Connecting wallet...";
      case ConnectionStatus.CONNECTING_TO_CUT:
        return "Connecting to the Cut...";
      case ConnectionStatus.SUCCESS:
        return "Connected successfully!";
      case ConnectionStatus.ERROR:
        return "Connection failed";
      default:
        return "";
    }
  };

  // Helper function to check if connecting
  const isConnecting =
    connectionStatus === ConnectionStatus.CONNECTING_WALLET ||
    connectionStatus === ConnectionStatus.CONNECTING_TO_CUT;

  // Watch for successful authentication and redirect
  useEffect(() => {
    if (user && connectionStatus === ConnectionStatus.CONNECTING_TO_CUT) {
      setConnectionStatus(ConnectionStatus.SUCCESS);
      // Small delay to show success state, then redirect
      setTimeout(() => {
        navigate(returnUrl, { replace: true });
      }, 1000);
    }
  }, [user, connectionStatus, returnUrl, navigate]);

  // Redirect if already connected - moved after all hooks
  if (user) {
    return <Navigate to={returnUrl} replace />;
  }

  const handleConnect = async () => {
    disconnect();
    setConnectionStatus(ConnectionStatus.CONNECTING_WALLET);
    await connect(
      {
        connector,
      },
      {
        onSuccess: () => {
          setConnectionStatus(ConnectionStatus.CONNECTING_TO_CUT);
        },
        onError: (error) => {
          console.log("connect OnError called", error);
          setConnectionStatus(ConnectionStatus.ERROR);
          disconnect();
        },
      }
    );
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {/* Logo and title */}
        <div className="flex items-center justify-center gap-3 mt-4 mb-4">
          <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />
          <h1 className="text-6xl font-bold text-black">
            the Cut
            <div className="text-2xl font-bold text-gray-400 mb-3">Fantasy Golf</div>
          </h1>
        </div>

        <div className="flex flex-col items-center gap-2 mb-4">
          {/* Terms of Service checkbox */}
          <div className="flex items-center gap-2 mb-2 font-display">
            <input
              type="checkbox"
              id="toc"
              checked={tocAccepted}
              onChange={(e) => setTocAccepted(e.target.checked)}
              disabled={isConnecting}
            />
            <label htmlFor="toc">
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Terms of Service
              </a>
            </label>
          </div>

          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 min-w-48"
            disabled={isConnecting || !tocAccepted}
            key={connector.uid}
            onClick={handleConnect}
            type="button"
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>

        {/* Connecting display */}
        {isConnecting && (
          <div className="mt-2 text-sm text-center">
            <div className="flex items-center gap-2 w-full justify-center text-gray-600">
              <LoadingSpinnerSmall color={"green"} />
              {getStatusText()}
            </div>
          </div>
        )}

        {/* Error display */}
        {connectionStatus === ConnectionStatus.ERROR && (
          <div className="text-red-500 mt-2 text-sm text-center">
            {error?.shortMessage || "Connection failed. Please try again."}
          </div>
        )}

        {/* Success display */}
        {connectionStatus === ConnectionStatus.SUCCESS && (
          <div className="text-green-500 mt-2 text-sm text-center">
            Connected successfully! Redirecting...
          </div>
        )}
      </div>
    </div>
  );
}
