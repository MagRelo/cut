import { useAccount } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { BRAND_PROSE } from "../../lib/brand";
import { isChainSupported } from "../../utils/blockchainUtils";
import { CopyToClipboard } from "./CopyToClipboard";

export function ChainWarning() {
  const { chainId } = useAccount();

  if (!chainId || isChainSupported(chainId)) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-sm shadow p-4 mb-4">
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
    <div className="bg-orange-50 border border-orange-200 rounded-sm shadow p-4 mb-4">
      <div className="text-lg font-semibold text-orange-700 font-display mb-2">
        <span className="pr-1">🎮</span> You're in Testing Mode
      </div>
      <div className="text-sm text-orange-700">
        <p className="mb-2 font-medium">Balances shown do not represent real value.</p>
      </div>
    </div>
  );
}

export function RealMoneyWarning() {
  const { chainId, address } = useAccount();

  if (chainId !== base.id) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-sm shadow p-4 mb-4">
      <div className="text-lg font-semibold text-blue-800 font-display mb-2">
        💡 Funding Your Account
      </div>
      <div className="text-sm text-blue-700">
        <p className="mb-2">
          You&apos;ll need xUSDC in your wallet to join contests and place parlays. If you&apos;re
          new to crypto, ask another user to send you testnet xUSDC to get started.
        </p>
        <p className="mb-2">
          If you already have xUSDC you can transfer it directly to your {BRAND_PROSE} account:
        </p>

        <div className="text-center font-medium text-sm pt-4 pb-3">
          <CopyToClipboard
            text={address || ""}
            truncated={false}
            displayText={
              <div className="text-center w-full">
                <p className="text-xs font-mono text-blue-700 break-all text-center">{address}</p>
                <span className="text-xs text-gray-500 mt-1 inline-block">(click to copy)</span>
              </div>
            }
            className="bg-gray-100 border border-blue-500 rounded-sm p-3 block w-full hover:bg-gray-200 transition-colors text-center"
          />
        </div>
      </div>
    </div>
  );
}
