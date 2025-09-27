import { useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { isChainSupported } from "../../utils/blockchainUtils";

export function ChainWarning() {
  const { chainId } = useAccount();

  if (!chainId || isChainSupported(chainId)) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg shadow p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-600 text-lg">⚠️</span>
        <div className="text-lg font-semibold text-red-800 font-display">Unsupported Network</div>
      </div>
      <div className="text-sm text-red-700">
        <p className="mb-2">
          You're connected to an unsupported network (Chain ID: {chainId}). Please switch to one of
          the supported networks to use this app.
        </p>
        <p>
          <strong>Supported networks:</strong> Base Mainnet, Base Sepolia (Testnet)
        </p>
      </div>
    </div>
  );
}

export function TestnetWarning() {
  const { chainId } = useAccount();

  if (chainId !== baseSepolia.id) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg shadow p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-orange-600 text-lg">🧪</span>
        <div className="text-lg font-semibold text-orange-800 font-display">Testnet Mode</div>
      </div>
      <div className="text-sm text-orange-700">
        <p className="mb-2">
          You're currently connected to Base Sepolia testnet. This is for testing purposes only.
        </p>
        <p>
          <strong>Note:</strong> Tokens on testnet have no real value and transactions may be
          slower.
        </p>
      </div>
    </div>
  );
}
