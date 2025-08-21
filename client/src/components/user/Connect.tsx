import { useState } from "react";
import { useConnectors, useDisconnect } from "wagmi";
import { Hooks } from "porto/wagmi";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

enum ConnectionStatus {
  IDLE = "idle",
  CONNECTING_WALLET = "connecting_wallet",
  CONNECTING_TO_CUT = "connecting_to_cut",
  SUCCESS = "success",
  ERROR = "error",
}

export function Connect() {
  const [connector] = useConnectors();
  const { mutate: connect, error } = Hooks.useConnect();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [tocAccepted, setTocAccepted] = useState(false);
  const { disconnect } = useDisconnect();

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
          console.log(error);
          disconnect();
          setConnectionStatus(ConnectionStatus.ERROR);
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {/* logo from Home page */}
      <div className="flex items-center justify-center gap-3 mt-4 mb-4">
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          <div className="text-2xl font-bold text-gray-400 mb-3">Fantasy Golf</div>
        </h1>
      </div>

      <div className="flex flex-col items-center gap-2 mb-4">
        {/* add a TOC checkbox */}
        <div className="flex items-center gap-2 mb-2 font-display">
          <input
            type="checkbox"
            id="toc"
            checked={tocAccepted}
            onChange={(e) => setTocAccepted(e.target.checked)}
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
        <div className="text-red-500 mt-2 text-sm text-center">{error?.message}</div>
      )}
    </div>
  );
}
