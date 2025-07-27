import React from "react";
import { useChainId } from "wagmi";
import { createExplorerLinkJSX } from "../../utils/blockchain";

interface BlockchainExplorerDemoProps {
  contestAddress?: string;
  paymentTokenAddress?: string;
}

export const BlockchainExplorerDemo: React.FC<BlockchainExplorerDemoProps> = ({
  contestAddress,
  paymentTokenAddress,
}) => {
  const chainId = useChainId();

  if (!chainId) {
    return (
      <div className="text-sm text-gray-500">
        Please connect your wallet to view blockchain explorer links
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Blockchain Explorer Links</h4>

      {contestAddress && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Contest Contract:</span>
          {createExplorerLinkJSX(
            contestAddress,
            chainId,
            "View on Explorer",
            "text-emerald-600 hover:text-emerald-800 underline text-sm"
          )}
        </div>
      )}

      {paymentTokenAddress && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Payment Token:</span>
          {createExplorerLinkJSX(
            paymentTokenAddress,
            chainId,
            "View on Explorer",
            "text-emerald-600 hover:text-emerald-800 underline text-sm"
          )}
        </div>
      )}

      {!contestAddress && !paymentTokenAddress && (
        <div className="text-sm text-gray-500">No blockchain addresses available</div>
      )}
    </div>
  );
};
