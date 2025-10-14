import { useAccount } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { isChainSupported } from "../../utils/blockchainUtils";

interface NetworkStatusProps {
  className?: string;
}

export function NetworkStatus({ className = "" }: NetworkStatusProps) {
  const { chainId, chain } = useAccount();

  if (!chainId || !chain) {
    return null;
  }

  const isSupported = isChainSupported(chainId);
  const isTestnet = chainId === baseSepolia.id;

  // const getNetworkIcon = () => {
  //   if (chainId === base.id) return "🔵";
  //   if (chainId === baseSepolia.id) return "🧪";
  //   return "⛓️";
  // };

  const getNetworkLabel = () => {
    if (chainId === base.id) return "Base Mainnet";
    if (chainId === baseSepolia.id) return "Base Sepolia";
    return chain.name;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* <span className="text-lg">{getNetworkIcon()}</span> */}
      <div className="flex flex-col">
        <div className={`text-sm font-medium ${isTestnet ? "text-orange-600" : "text-gray-700"}`}>
          {getNetworkLabel()}
        </div>
        {!isSupported && <div className="text-xs text-red-500">Unsupported network</div>}
        {/* {isTestnet && <div className="text-xs text-orange-500">Testnet</div>} */}
      </div>
    </div>
  );
}
