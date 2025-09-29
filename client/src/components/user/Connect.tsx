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
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {/* logo from Home page */}
      <div className="flex items-center justify-center gap-3 mt-4 mb-6">
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          <div className="text-2xl font-bold text-gray-400 mb-3">Fantasy Golf</div>
        </h1>
      </div>

      <div className="space-y-8">
        {/* Real Money Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💰</span>
            <div>
              <h2 className="text-xl font-bold text-blue-800">Real Money Contests</h2>
              <p className="text-sm text-blue-600">Base Mainnet</p>
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Play with real money and compete for actual prizes. All contests use real USDC and real
            rewards.
          </p>

          {/* TOC checkbox for mainnet */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="toc"
              checked={tocAccepted}
              onChange={(e) => setTocAccepted(e.target.checked)}
            />
            <label htmlFor="toc" className="text-sm">
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
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 w-full"
            disabled={isConnecting || !tocAccepted}
            onClick={() => handleConnect("mainnet")}
            type="button"
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>

        {/* Testing Section */}
        <div className="border border-gray-200 rounded-lg p-6 bg-orange-50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎮</span>
            <div>
              <h2 className="text-xl font-bold text-orange-800">Testing & Practice</h2>
              <p className="text-sm text-orange-600">Base Sepolia</p>
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Practice with fake money and test features without any risk. Perfect for learning how to
            play.
          </p>

          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 w-full"
            disabled={isConnecting}
            onClick={() => handleConnect("testnet")}
            type="button"
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>

      {/* Connecting display */}
      {isConnecting && (
        <div className="mt-4 text-sm text-center">
          <div className="flex items-center gap-2 w-full justify-center text-gray-600">
            <LoadingSpinnerSmall color={"green"} />
            {getStatusText()}
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
