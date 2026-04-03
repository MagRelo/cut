import { useCallback, useMemo, useRef, useState } from "react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, type Abi } from "viem";

export interface TransactionCall {
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

function isPrivyEmbeddedWallet(
  address: string | undefined,
  wallets: ReturnType<typeof useWallets>["wallets"],
): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return wallets.some(
    (w) =>
      w.type === "ethereum" &&
      w.address.toLowerCase() === normalized &&
      w.walletClientType === "privy",
  );
}

export function useBlockchainTransaction(options?: UseBlockchainTransactionOptions) {
  /**
   * `execute()` is async; when the tx completes it must call the *latest* success/error handlers.
   * Inline handlers from parents close over state from the render where `execute` was invoked —
   * before `setState` for "pending" payloads has committed — so always read callbacks from a ref
   * updated every render.
   */
  const callbacksRef = useRef<UseBlockchainTransactionOptions>(options ?? {});
  callbacksRef.current = options ?? {};

  const queryClient = useQueryClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { sendTransaction } = useSendTransaction();
  const { wallets, ready: walletsReady } = useWallets();
  const { getClientForChain } = useSmartWallets();

  const useSponsoredPrivyTx = useMemo(
    () => walletsReady && isPrivyEmbeddedWallet(address, wallets),
    [walletsReady, address, wallets],
  );

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
    if (!publicClient) {
      const msg = "Network client not available";
      setUserFriendlyError(msg);
      callbacksRef.current.onError?.(msg);
      callbacksRef.current.onSettled?.();
      return;
    }
    if (!walletsReady) {
      const msg = "Wallet is still initializing. Please try again in a moment.";
      setUserFriendlyError(msg);
      callbacksRef.current.onError?.(msg);
      callbacksRef.current.onSettled?.();
      return;
    }
    let smartWalletClient: Awaited<ReturnType<typeof getClientForChain>> | undefined;
    try {
      smartWalletClient = await getClientForChain({ id: chainId });
    } catch {
      smartWalletClient = undefined;
    }

    if (!smartWalletClient && !useSponsoredPrivyTx && !walletClient) {
      const msg = "Wallet not connected";
      setUserFriendlyError(msg);
      callbacksRef.current.onError?.(msg);
      callbacksRef.current.onSettled?.();
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

      if (smartWalletClient) {
        const batchCalls = calls.map((call) => ({
          to: call.to,
          data: encodeFunctionData({
            abi: call.abi as Abi,
            functionName: call.functionName,
            args: [...call.args] as never,
          }),
          value: 0n,
        }));
        setIsSending(true);
        setIsConfirming(false);
        const hash = await smartWalletClient.sendTransaction({
          calls: batchCalls,
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
      } else {
        for (const call of calls) {
          setIsSending(true);
          setIsConfirming(false);
          let hash: `0x${string}`;
          if (useSponsoredPrivyTx) {
            const data = encodeFunctionData({
              abi: call.abi as Abi,
              functionName: call.functionName,
              args: [...call.args] as never,
            });
            const result = await sendTransaction(
              {
                to: call.to,
                data,
                chainId,
                value: 0n,
              },
              { sponsor: true, address: address ?? undefined },
            );
            hash = result.hash;
          } else {
            if (!walletClient) {
              throw new Error("Wallet not connected");
            }
            hash = await walletClient.writeContract({
              address: call.to,
              abi: call.abi as Abi,
              functionName: call.functionName,
              args: [...call.args] as never,
            });
          }
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
        await callbacksRef.current.onSuccess?.(statusData);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["balance"] }),
          queryClient.invalidateQueries({ queryKey: ["readContract"] }),
          queryClient.invalidateQueries({ queryKey: ["readContracts"] }),
        ]);
        setConfirmedSuccess(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setUserFriendlyError(errorMsg);
        callbacksRef.current.onError?.(error instanceof Error ? error : new Error(String(error)));
        setConfirmedFailure(true);
      }
    } catch (error) {
      console.error("Error executing blockchain transaction:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUserFriendlyError(errorMsg);
      callbacksRef.current.onError?.(error instanceof Error ? error : new Error(String(error)));
      setConfirmedFailure(true);
    } finally {
      setIsProcessing(false);
      setIsSending(false);
      setIsConfirming(false);
      callbacksRef.current.onSettled?.();
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
