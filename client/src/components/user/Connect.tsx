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
  const [mainnetTocAccepted, setMainnetTocAccepted] = useState(false);
  const [testnetTocAccepted, setTestnetTocAccepted] = useState(false);
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
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {/* logo from Home page */}
      <div className="flex items-center justify-center gap-2 mt-2 mb-4">
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-12" />
        <h1 className="text-4xl font-bold text-black">
          the Cut
          <div className="text-lg font-bold text-gray-400 mb-1">Fantasy Golf</div>
        </h1>
      </div>

      {/* Connecting display */}
      {isConnecting ? (
        <div className="mt-4 text-sm text-center min-h-10">
          <div className="flex items-center gap-2 w-full justify-center text-gray-400 font-semibold font-display">
            <LoadingSpinnerSmall color={"green"} />
            {getStatusText()}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Real Money Section */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💰</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Real Money Contests</h2>
                <p className="text-xs text-gray-600">Base Mainnet</p>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-3">Deposit USDC and compete for real stakes.</p>

            {/* TOC checkbox for mainnet */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="toc-mainnet"
                checked={mainnetTocAccepted}
                onChange={(e) => setMainnetTocAccepted(e.target.checked)}
              />
              <label htmlFor="toc-mainnet" className="text-sm text-gray-700">
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
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 w-full"
              disabled={isConnecting || !mainnetTocAccepted}
              onClick={() => handleConnect("mainnet")}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </div>

          {/* Testing Section */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎮</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Testing & Practice</h2>
                <p className="text-xs text-gray-600">Base Sepolia Testnet</p>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-3">
              Practice with fake money and test features without any risk. Perfect for learning how
              to play.
            </p>

            {/* TOC checkbox for testnet */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="toc-testnet"
                checked={testnetTocAccepted}
                onChange={(e) => setTestnetTocAccepted(e.target.checked)}
              />
              <label htmlFor="toc-testnet" className="text-sm text-gray-700">
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
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 w-full"
              disabled={isConnecting || !testnetTocAccepted}
              onClick={() => handleConnect("testnet")}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {connectionStatus === ConnectionStatus.ERROR && (
        <div className="text-red-500 mt-4 text-sm text-center">{error?.shortMessage}</div>
      )}
    </div>
  );
}
