import { useChainId } from "wagmi";
import { useBlockchainTransaction } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import ContestFactoryContract from "../utils/contracts/ContestFactory.json";

interface UseBlockchainTransactionOptions {
  onSuccess?: (data: unknown) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}

/**
 * Hook for creating a new contest via ContestFactory
 */
export function useCreateContest(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

  /** Matches `ContestFactory.createContest(address,address,uint256,uint256,uint256,uint256,uint256,uint256)`. */
  const createContestCalls = (
    paymentToken: string,
    oracle: string,
    primaryDepositAmount: bigint,
    oracleFeeBps: number,
    expiryTimestamp: bigint,
    positionBonusShareBps: number,
    targetPrimaryShareBps: number,
    maxCrossSubsidyBps: number,
  ) => {
    return [
      {
        abi: ContestFactoryContract.abi,
        args: [
          paymentToken as `0x${string}`,
          oracle as `0x${string}`,
          primaryDepositAmount,
          BigInt(oracleFeeBps),
          expiryTimestamp,
          BigInt(positionBonusShareBps),
          BigInt(targetPrimaryShareBps),
          BigInt(maxCrossSubsidyBps),
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
