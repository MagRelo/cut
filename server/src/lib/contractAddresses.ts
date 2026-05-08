import { isAddress, type Address } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };

type ContractsJson = { platformTokenAddress?: string };

function contractsForChain(chainId: number): ContractsJson | null {
  switch (chainId) {
    case 8453:
      return baseContracts as ContractsJson;
    case 84532:
      return sepoliaContracts as ContractsJson;
    default:
      return null;
  }
}

/** Platform token (CUT) address from deployed config, or null if unknown chain or unset. */
export function getPlatformTokenAddress(chainId: number): Address | null {
  const cfg = contractsForChain(chainId);
  const raw = cfg?.platformTokenAddress?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw;
}
