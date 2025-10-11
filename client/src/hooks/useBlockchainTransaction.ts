import { useEffect, useState } from "react";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

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

export function useBlockchainTransaction(options?: UseBlockchainTransactionOptions) {
  const { onSuccess, onError, onSettled } = options || {};
  const queryClient = useQueryClient();

  const {
    sendCalls,
    data: sendCallsData,
    isPending: isSending,
    error: sendCallsError,
    reset,
  } = useSendCalls();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmationError,
    data: statusData,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle transaction completion
  useEffect(() => {
    const handleCompletion = async () => {
      if (!isConfirmed || !statusData) {
        return;
      }

      // Transaction failed
      if (statusData.status === "failure") {
        const errorMsg = "Blockchain transaction failed. Please try again.";
        onError?.(errorMsg);
        setIsProcessing(false);
        onSettled?.();
        console.log("Blockchain transaction failed. Status data:", statusData);
        return;
      }

      // Transaction succeeded
      if (statusData.status === "success") {
        try {
          // Call the custom success handler
          await onSuccess?.(statusData);

          // Automatically refresh all balances after successful transaction
          await queryClient.invalidateQueries({
            queryKey: ["balance"],
          });
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
          setIsProcessing(false);
          onSettled?.();
        }
      }
    };

    handleCompletion();
  }, [isConfirmed, statusData, onSuccess, onError, onSettled, queryClient]);

  // Handle send errors
  useEffect(() => {
    if (sendCallsError) {
      onError?.(sendCallsError);
      setIsProcessing(false);
      onSettled?.();
    }
  }, [sendCallsError, onError, onSettled]);

  // Handle confirmation errors
  useEffect(() => {
    if (confirmationError) {
      onError?.(confirmationError);
      setIsProcessing(false);
      onSettled?.();
    }
  }, [confirmationError, onError, onSettled]);

  const execute = async (calls: TransactionCall[]) => {
    try {
      setIsProcessing(true);
      await sendCalls({ calls });
    } catch (error) {
      console.error("Error executing blockchain transaction:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      setIsProcessing(false);
      onSettled?.();
    }
  };

  return {
    execute,
    isProcessing: isProcessing || isSending || isConfirming,
    isSending,
    isConfirming,
    isConfirmed: isConfirmed && statusData?.status === "success",
    isFailed: isConfirmed && statusData?.status === "failure",
    transactionHash: statusData?.receipts?.[0]?.transactionHash,
    statusData,
    error: sendCallsError || confirmationError,
    reset,
  };
}
