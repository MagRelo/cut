import { useAccount, useChainId } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { CopyToClipboard } from "../common/CopyToClipboard.tsx";
import { getContractAddress, useTokenSymbol } from "../../utils/blockchainUtils.tsx";

interface ReceiveProps {
  tokenName?: "CUT" | "USDC";
}

export const Receive = ({ tokenName = "CUT" }: ReceiveProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically based on token type
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // Select the appropriate token address based on tokenName
  const tokenAddress = tokenName === "USDC" ? paymentTokenAddress : platformTokenAddress;

  // Get token symbol from contract
  const { data: tokenSymbol } = useTokenSymbol(tokenAddress as string);
  const displaySymbol = tokenSymbol || tokenName;

  if (!isConnected || !address) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please connect your wallet to view your address.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3">Receive {displaySymbol}</h3>

      <p className="text-sm text-gray-600">
        Share your wallet address or QR code to receive {displaySymbol} tokens from other users.
      </p>

      {/* QR Code */}
      <div className="flex justify-center py-4">
        <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
          <QRCodeSVG value={address} size={140} />
        </div>
      </div>

      {/* Address Display with Copy */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-lg border border-gray-200/50">
        <div className="text-xs font-medium text-gray-600 mb-2">Your Wallet Address</div>
        <CopyToClipboard
          text={address}
          displayText={
            <div className="w-full">
              <p className="font-mono text-sm text-gray-800 break-all">{address}</p>
              <span className="text-xs text-gray-500 mt-2 inline-block">Click to copy address</span>
            </div>
          }
          className="w-full text-left hover:bg-gray-100 p-3 rounded-lg transition-colors"
        />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important</p>
            <p>
              Make sure the sender is on the same network. Only send tokens from trusted sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
