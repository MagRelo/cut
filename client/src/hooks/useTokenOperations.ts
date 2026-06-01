import { useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useBlockchainTransaction, type UseBlockchainTransactionOptions } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import MockUSDC from "../utils/contracts/MockUSDC.json";
import { PAYMENT_TOKEN_DECIMALS } from "../lib/paymentTokenSpend";

interface UseTransferTokensOptions extends UseBlockchainTransactionOptions {
  tokenDecimals?: number;
}

/**
 * Transfer xUSDC (payment token) to another address.
 */
export function useTransferTokens(options?: UseTransferTokensOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const tokenDecimals = options?.tokenDecimals ?? PAYMENT_TOKEN_DECIMALS;

  const createTransferCalls = (recipient: string, amount: string) => {
    const tokenAmount = parseUnits(amount, tokenDecimals);

    return [
      {
        abi: MockUSDC.abi,
        args: [recipient, tokenAmount],
        functionName: "transfer",
        to: paymentTokenAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createTransferCalls,
  };
}
