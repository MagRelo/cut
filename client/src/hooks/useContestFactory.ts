import { useChainId } from "wagmi";
import { useBlockchainTransaction } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import ContestFactoryContract from "../utils/contracts/ContestFactory.json";

interface UseBlockchainTransactionOptions {
  onSuccess?: (data: any) => void | Promise<void>;
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

  const createContestCalls = (
    paymentToken: string,
    oracle: string,
    contestantDepositAmount: bigint,
    oracleFee: number,
    expiry: bigint,
    liquidityParameter: bigint,
    demandSensitivity: number,
    positionBonusShareBps: number,
    targetPrimaryShareBps: number = 6000,
    maxCrossSubsidyBps: number = 1500
  ) => {
    return [
      {
        abi: ContestFactoryContract.abi,
        args: [
          paymentToken as `0x${string}`,
          oracle as `0x${string}`,
          contestantDepositAmount,
          oracleFee,
          expiry,
          liquidityParameter,
          demandSensitivity,
          positionBonusShareBps,
          targetPrimaryShareBps,
          maxCrossSubsidyBps,
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
