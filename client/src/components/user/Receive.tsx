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

  // Format address with chain information using EIP-681 standard
  // Format: ethereum:<address>@<chainId>
  const qrCodeValue = `ethereum:${address}@${chainId}`;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3">Receive {displaySymbol}</h3>

      <p className="text-sm text-gray-600">
        Share your wallet address or QR code to receive {displaySymbol} tokens from other users.
      </p>

      {/* QR Code */}
      <div className="flex justify-center py-4">
        <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
          <QRCodeSVG value={qrCodeValue} size={140} />
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-2 text-center">
        <CopyToClipboard text={address} truncated={false} />
      </div>
    </div>
  );
};
