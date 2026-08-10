import { useChainId } from "wagmi";
import { useBlockchainTransaction, type UseBlockchainTransactionOptions } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import ContestFactoryContract from "../utils/contracts/ContestFactory.json";

/**
 * Hook for creating a new contest via ContestFactory
 */
export function useCreateContest(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

  /** Matches `ContestFactory.createContest` (ContestCatalyst). */
  const createContestCalls = (
    primaryDepositAmount: bigint,
    referralNetworkBps: number,
    expiryTimestamp: bigint,
    primaryDepositSecondarySubsidyBps: number,
  ) => {
    return [
      {
        abi: ContestFactoryContract.abi,
        args: [
          primaryDepositAmount,
          BigInt(referralNetworkBps),
          expiryTimestamp,
          BigInt(primaryDepositSecondarySubsidyBps),
        ],
        functionName: "createContest",
        to: contestFactoryAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createContestCalls,
  };
}
