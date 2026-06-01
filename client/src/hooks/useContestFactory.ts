import { useChainId } from "wagmi";
import type { Hex } from "viem";
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
    paymentToken: string,
    oracle: string,
    primaryDepositAmount: bigint,
    referralNetworkBps: number,
    expiryTimestamp: bigint,
    primaryDepositSecondarySubsidyBps: number,
    rewardDistributor: string,
    referralGroupId: Hex,
  ) => {
    return [
      {
        abi: ContestFactoryContract.abi,
        args: [
          paymentToken as `0x${string}`,
          oracle as `0x${string}`,
          primaryDepositAmount,
          BigInt(referralNetworkBps),
          expiryTimestamp,
          BigInt(primaryDepositSecondarySubsidyBps),
          rewardDistributor as `0x${string}`,
          referralGroupId,
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
