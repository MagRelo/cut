import { useState, useEffect } from "react";
import { useConnectors, useSwitchChain } from "wagmi";
import { Hooks } from "porto/wagmi";
import { base, baseSepolia } from "wagmi/chains";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

enum ConnectionStatus {
  IDLE = "idle",
  CONNECTING_WALLET = "connecting_wallet",
  CONNECTING_TO_CUT = "connecting_to_cut",
  SUCCESS = "success",
  ERROR = "error",
}

type NetworkOption = "mainnet" | "testnet";

interface ConnectProps {
  onSuccess?: () => void;
}

export function Connect({ onSuccess }: ConnectProps = {}) {
  const [connector] = useConnectors();
  const { mutate: connect, error } = Hooks.useConnect();
  const { switchChain } = useSwitchChain();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [tocAccepted, setTocAccepted] = useState(false);
  const { user } = usePortoAuth();

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

  // Watch for successful authentication and call onSuccess callback
  useEffect(() => {
    if (user && connectionStatus === ConnectionStatus.CONNECTING_TO_CUT) {
      setConnectionStatus(ConnectionStatus.SUCCESS);
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [user, connectionStatus, onSuccess]);

  const handleConnect = async (network: NetworkOption) => {
    setConnectionStatus(ConnectionStatus.CONNECTING_WALLET);

    try {
      // Connect the wallet first
      await connect(
        {
          connector,
        },
        {
          onSuccess: async () => {
            setConnectionStatus(ConnectionStatus.CONNECTING_TO_CUT);
            // Switch to selected network after successful connection
            const targetChainId = network === "mainnet" ? base.id : baseSepolia.id;
            try {
              await switchChain({ chainId: targetChainId as 8453 | 84532 });
            } catch (switchError) {
              console.log("Network switch failed after connect:", switchError);
              // Don't fail the connection if network switch fails
            }
          },
          onError: (error) => {
            console.log("connect OnError called", error);
            setConnectionStatus(ConnectionStatus.ERROR);
          },
        }
      );
    } catch (error) {
      console.log("Connection failed:", error);
      setConnectionStatus(ConnectionStatus.ERROR);
    }
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
      {/* Connecting display */}
      {isConnecting ? (
        <div className="p-8 text-center">
          <div className="flex items-center gap-3 justify-center text-gray-400 font-medium font-display">
            <LoadingSpinnerSmall color={"green"} />
            {getStatusText()}
          </div>
        </div>
      ) : (
        <div>
          <div className="p-6 space-y-5">
            {/* Main Content */}
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

            {/* TOC checkbox */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-sm border border-gray-200">
              <input
                type="checkbox"
                id="toc"
                checked={tocAccepted}
                onChange={(e) => setTocAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="toc" className="text-sm text-gray-700 leading-relaxed">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  Terms of Service
                </a>
              </label>
            </div>

            {/* Primary Mainnet Connect Button - TEMPORARILY DISABLED */}
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md text-lg"
              disabled={true}
              onClick={() => handleConnect("mainnet")}
              type="button"
            >
              Sign in
            </button>

            {/* Testnet Option - ALWAYS VISIBLE */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Testnet
                  </span>
                  <span className="text-xs font-medium text-gray-700">Base Sepolia</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Practice with test tokens without any risk. For testing purposes only.
                </p>
                <button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  disabled={isConnecting || !tocAccepted}
                  onClick={() => handleConnect("testnet")}
                  type="button"
                >
                  Connect to Testnet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {connectionStatus === ConnectionStatus.ERROR && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600 text-center">{error?.shortMessage}</p>
        </div>
      )}
      {/* Error display */}
      {connectionStatus === ConnectionStatus.ERROR && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600 text-center">{error?.message}</p>
        </div>
      )}
    </div>
  );
}
