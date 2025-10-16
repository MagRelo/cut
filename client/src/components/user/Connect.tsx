import { useState, useEffect } from "react";
import { useConnectors, useDisconnect, useSwitchChain } from "wagmi";
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
  const { disconnect } = useDisconnect();
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
    disconnect();
    setConnectionStatus(ConnectionStatus.CONNECTING_WALLET);

    // Switch to selected network before connecting
    const targetChainId = network === "mainnet" ? base.id : baseSepolia.id;

    try {
      // First switch to the selected network
      await switchChain({ chainId: targetChainId as 8453 | 84532 });

      // Then connect the wallet
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
    } catch (error) {
      console.log("Network switch failed:", error);
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
          {/* Header */}
          {/* <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Connect to the Cut</h3>
            <p className="text-sm text-gray-500 mt-1">Choose your network to get started</p>
          </div> */}

          <div className="p-6 pt-4 space-y-4">
            {/* Single TOC checkbox */}
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

            {/* Network Options */}
            <div className="space-y-3">
              {/* Real Money Section */}
              <div className="group border-2 border-gray-200 rounded-sm hover:border-slate-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-gray-900">
                          Real Money Contests
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Live
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Base Mainnet</p>
                      <p className="text-sm text-gray-600">
                        Deposit USDC and compete for real stakes
                      </p>
                    </div>
                  </div>

                  <button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={isConnecting || !tocAccepted}
                    onClick={() => handleConnect("mainnet")}
                    type="button"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Testing Section */}
              <div className="group border-2 border-gray-200 rounded-sm hover:border-slate-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-gray-900">
                          Testing & Practice
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Testnet
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Base Sepolia</p>
                      <p className="text-sm text-gray-600">
                        Practice with test tokens without any risk
                      </p>
                    </div>
                  </div>

                  <button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={isConnecting || !tocAccepted}
                    onClick={() => handleConnect("testnet")}
                    type="button"
                  >
                    Connect
                  </button>
                </div>
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
    </div>
  );
}
