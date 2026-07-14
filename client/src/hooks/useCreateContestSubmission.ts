import { useRef, useState } from "react";
import { useChainId } from "wagmi";
import { decodeEventLog } from "viem";

import { type Contest, type CreateContestInput } from "../types/contest";
import { useCreateContest as useCreateContestMutation } from "./useContestMutations";
import { useCreateContest } from "./useContestFactory";
import type { BatchTransactionStatusData } from "./useBlockchainTransaction";
import ContestFactoryContract from "../utils/contracts/ContestFactory.json";
import { getContractAddress } from "../utils/blockchainUtils.tsx";
import { buildCreateContestFactoryCallParams } from "../lib/contestCreation";
import { useAuth } from "../contexts/AuthContext";

export function getCreateContestStatusMessage(
  isSending: boolean,
  isConfirming: boolean,
): string {
  if (isSending) return "User confirmation...";
  if (isConfirming) return "Network confirmation...";
  return "idle";
}

interface UseCreateContestSubmissionOptions {
  onContestCreated?: (contest: Contest) => void;
  maxReferralNetworkBps?: number;
}

export function useCreateContestSubmission(options?: UseCreateContestSubmissionOptions) {
  const chainId = useChainId();
  const createContestMutation = useCreateContestMutation();
  const { paymentTokenAddress } = useAuth();
  const pendingContestForApiRef = useRef<CreateContestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    execute,
    isProcessing,
    isSending,
    isConfirming,
    isFailed,
    error: transactionError,
    createContestCalls,
  } = useCreateContest({
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      const pendingFromTx = pendingContestForApiRef.current;
      if (!pendingFromTx) return;

      setLoading(true);
      try {
        const tx = statusData;
        let contestAddress: string | undefined;
        const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

        if (tx.receipts && tx.receipts.length > 0) {
          for (const receipt of tx.receipts) {
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                if (log.address?.toLowerCase() === contestFactoryAddress?.toLowerCase()) {
                  try {
                    const decodedLog = decodeEventLog({
                      abi: ContestFactoryContract.abi,
                      data: log.data!,
                      topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
                    });

                    if (
                      decodedLog.eventName === "ContestCreated" &&
                      decodedLog.args &&
                      typeof decodedLog.args === "object" &&
                      "contest" in decodedLog.args
                    ) {
                      contestAddress = decodedLog.args.contest as string;
                      break;
                    }
                  } catch (decodeError) {
                    console.debug("Could not decode log, skipping:", decodeError);
                  }
                }
              }
            }
            if (contestAddress) break;
          }
        }

        if (!contestAddress) {
          throw new Error("No contest address found in transaction logs");
        }

        createContestMutation.mutate(
          {
            ...pendingFromTx,
            transactionId: tx.receipts?.[0]?.transactionHash || "",
            address: contestAddress,
          },
          {
            onSuccess: (contest) => {
              pendingContestForApiRef.current = null;
              setLoading(false);
              options?.onContestCreated?.(contest);
            },
            onError: (err) => {
              console.error("Error creating contest in backend:", err);
              pendingContestForApiRef.current = null;
              setError("Failed to create contest in backend");
              setLoading(false);
            },
          },
        );
      } catch (err) {
        console.error("Error processing transaction:", err);
        pendingContestForApiRef.current = null;
        setError("Failed to process transaction");
        setLoading(false);
      }
    },
    onError: () => {
      setError("Blockchain transaction failed. Please try again.");
      pendingContestForApiRef.current = null;
      setLoading(false);
    },
  });

  const submitContest = async (pending: CreateContestInput) => {
    setError(null);

    const built = buildCreateContestFactoryCallParams(
      pending,
      chainId ?? 0,
      paymentTokenAddress || "",
      { maxReferralNetworkBps: options?.maxReferralNetworkBps },
    );
    if ("error" in built) {
      setError(built.error);
      return;
    }

    pendingContestForApiRef.current = pending;
    const { params } = built;
    const calls = createContestCalls(
      params.paymentToken,
      params.oracle,
      params.primaryDepositAmount,
      params.referralNetworkBps,
      params.expiryTimestamp,
      params.primaryDepositSecondarySubsidyBps,
      params.referralGraph,
      params.rewardCalculator,
      params.referralGroupId,
    );

    await execute(calls);
  };

  return {
    submitContest,
    loading,
    error,
    setError,
    isProcessing,
    isSending,
    isConfirming,
    isFailed,
    transactionError,
  };
}
