import { getAddress, isAddress, type Address } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };

type ContractsJson = { paymentTokenAddress?: string; contestFactoryAddress?: string };

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

function checksumAddress(raw: string | undefined): Address | null {
  const trimmed = raw?.trim();
  if (!trimmed || !isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

/** Payment token (xUSDC) address from deployed config, or null if unknown chain or unset. */
export function getPaymentTokenAddress(chainId: number): Address | null {
  return checksumAddress(contractsForChain(chainId)?.paymentTokenAddress);
}

/** ContestFactory address from deployed config, or null if unknown chain or unset. */
export function getContestFactoryAddress(chainId: number): Address | null {
  return checksumAddress(contractsForChain(chainId)?.contestFactoryAddress);
}

/** Primary contest deposit in token wei (6 decimals on Sepolia xUSDC). */
export function primaryDepositWeiFromSettings(primaryDeposit: number, chainId: number): bigint {
  const decimals = chainId === 84532 ? 6 : 6;
  return BigInt(Math.floor(primaryDeposit * 10 ** decimals));
}
