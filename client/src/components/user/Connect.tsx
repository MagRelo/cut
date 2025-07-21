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
        signInWithEthereum: {
          authUrl: import.meta.env.VITE_API_URL + "/auth/siwe",
        },
      },
      {
        onSuccess: () => {
          setConnectionStatus(ConnectionStatus.CONNECTING_TO_CUT);
        },
        onError: (error) => {
          console.log("discconect>", error);
          console.log(error);
          disconnect();
          setConnectionStatus(ConnectionStatus.ERROR);
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex flex-col gap-2">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
          disabled={isConnecting}
          key={connector.uid}
          onClick={handleConnect}
          type="button"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </button>
      </div>

      {/* Add status display */}
      <div className="mt-2 text-sm text-center">
        {/* Connecting display */}
        {isConnecting && (
          <div className="flex items-center gap-2 w-full justify-center text-gray-600">
            <LoadingSpinnerSmall color={"green"} />
            {getStatusText()}
          </div>
        )}

        {/* Error display */}
        {connectionStatus === ConnectionStatus.ERROR && (
          <div className="text-red-500">{error?.message}</div>
        )}
      </div>
    </div>
  );
}
