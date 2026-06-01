import { isAddress, type Address } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };

type ContractsJson = { paymentTokenAddress?: string };

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

/** Payment token (xUSDC) address from deployed config, or null if unknown chain or unset. */
export function getPaymentTokenAddress(chainId: number): Address | null {
  const cfg = contractsForChain(chainId);
  const raw = cfg?.paymentTokenAddress?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw;
}

/** Primary contest deposit in token wei (6 decimals on Sepolia xUSDC). */
export function primaryDepositWeiFromSettings(primaryDeposit: number, chainId: number): bigint {
  const decimals = chainId === 84532 ? 6 : 6;
  return BigInt(Math.floor(primaryDeposit * 10 ** decimals));
}
