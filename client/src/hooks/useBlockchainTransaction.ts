import { useCallback, useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { Abi } from "viem";

interface TransactionCall {
  abi: readonly unknown[];
  args: readonly unknown[];
  functionName: string;
  to: `0x${string}`;
}

interface UseBlockchainTransactionOptions {
  onSuccess?: (data: unknown) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}

/** Shape expected by CreateContestForm and similar onSuccess handlers */
export type BatchTransactionStatusData = {
  status: "success";
  receipts: Array<{
    transactionHash: `0x${string}`;
    logs: readonly {
      address: `0x${string}`;
      topics: readonly `0x${string}`[];
      data: `0x${string}`;
    }[];
  }>;
};

export function useBlockchainTransaction(options?: UseBlockchainTransactionOptions) {
  const { onSuccess, onError, onSettled } = options || {};
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userFriendlyError, setUserFriendlyError] = useState<string | null>(null);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [confirmedFailure, setConfirmedFailure] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [lastStatusData, setLastStatusData] = useState<BatchTransactionStatusData | undefined>();

  const reset = useCallback(() => {
    setUserFriendlyError(null);
    setConfirmedSuccess(false);
    setConfirmedFailure(false);
    setLastTxHash(undefined);
    setLastStatusData(undefined);
    setIsProcessing(false);
    setIsSending(false);
    setIsConfirming(false);
  }, []);

  const execute = async (calls: TransactionCall[]) => {
    if (!walletClient) {
      const msg = "Wallet not connected";
      setUserFriendlyError(msg);
      onError?.(msg);
      onSettled?.();
      return;
    }
    if (!publicClient) {
      const msg = "Network client not available";
      setUserFriendlyError(msg);
      onError?.(msg);
      onSettled?.();
      return;
    }

    try {
      setIsProcessing(true);
      setUserFriendlyError(null);
      setConfirmedSuccess(false);
      setConfirmedFailure(false);
      setLastTxHash(undefined);
      setLastStatusData(undefined);

      const receipts: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>[] = [];

      for (const call of calls) {
        setIsSending(true);
        setIsConfirming(false);
        const hash = await walletClient.writeContract({
          address: call.to,
          abi: call.abi as Abi,
          functionName: call.functionName,
          args: [...call.args] as never,
        });
        setIsSending(false);
        setIsConfirming(true);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted");
        }
        receipts.push(receipt);
        setLastTxHash(receipt.transactionHash);
        setIsConfirming(false);
      }

      const statusData: BatchTransactionStatusData = {
        status: "success",
        receipts: receipts.map((r) => ({
          transactionHash: r.transactionHash,
          logs: r.logs,
        })),
      };
      setLastStatusData(statusData);

      try {
        setUserFriendlyError(null);
        await onSuccess?.(statusData);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["balance"] }),
          queryClient.invalidateQueries({ queryKey: ["readContract"] }),
          queryClient.invalidateQueries({ queryKey: ["readContracts"] }),
        ]);
        setConfirmedSuccess(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setUserFriendlyError(errorMsg);
        onError?.(error instanceof Error ? error : new Error(String(error)));
        setConfirmedFailure(true);
      }
    } catch (error) {
      console.error("Error executing blockchain transaction:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUserFriendlyError(errorMsg);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      setConfirmedFailure(true);
    } finally {
      setIsProcessing(false);
      setIsSending(false);
      setIsConfirming(false);
      onSettled?.();
    }
  };

  return {
    execute,
    isProcessing: isProcessing || isSending || isConfirming,
    isSending,
    isConfirming,
    isConfirmed: confirmedSuccess,
    isFailed: confirmedFailure,
    transactionHash: lastTxHash,
    statusData: lastStatusData,
    error: userFriendlyError,
    reset,
  };
}
