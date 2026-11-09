import { useCallback, useMemo, useRef, useState } from "react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, type Abi } from "viem";
import { findTransferLog, type ChainTransfer } from "../lib/chainTransfer";
import { txPhaseInFlight, type TxPhase } from "../lib/txPhase";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";

export interface TransactionCall {
  abi: readonly unknown[];
  args: readonly unknown[];
  functionName: string;
  to: `0x${string}`;
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

type MinedReceipt = {
  transactionHash: `0x${string}`;
  logs: readonly {
    address: `0x${string}`;
    topics: readonly `0x${string}`[];
    data: `0x${string}`;
    logIndex: number | null;
  }[];
};

export interface UseBlockchainTransactionOptions {
  onSuccess?: (data: BatchTransactionStatusData) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}

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

function toStatusData(receipts: readonly MinedReceipt[]): BatchTransactionStatusData {
  return {
    status: "success",
    receipts: receipts.map((receipt) => ({
      transactionHash: receipt.transactionHash,
      logs: receipt.logs,
    })),
  };
}

async function postChainTransfer(
  transfer: ChainTransfer,
  receipts: readonly MinedReceipt[],
  chainId: number,
): Promise<void> {
  for (const receipt of receipts) {
    const found = findTransferLog(receipt.logs, transfer);
    if (!found) continue;
    await apiClient.post(
      "/auth/onchain-payments",
      {
        kind: transfer.kind,
        tokenAddress: transfer.tokenAddress,
        amountWei: found.amountWei,
        from: transfer.from,
        to: transfer.to,
        contestId: transfer.contestId,
        entryId: transfer.entryId,
        lineupId: transfer.lineupId,
        transactionHash: receipt.transactionHash,
        logIndex: found.logIndex,
      },
      { requiresAuth: true, chainId },
    );
    return;
  }
  throw new Error("Could not find the token transfer in the receipt");
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

  const [phase, setPhaseState] = useState<TxPhase>("idle");
  const phaseRef = useRef<TxPhase>("idle");
  const [userFriendlyError, setUserFriendlyError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [lastStatusData, setLastStatusData] = useState<BatchTransactionStatusData | undefined>();
  const lastTransferRef = useRef<ChainTransfer | undefined>(undefined);
  const lastReceiptsRef = useRef<MinedReceipt[]>([]);
  const lastStatusRef = useRef<BatchTransactionStatusData | undefined>(undefined);
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;

  const setPhase = (next: TxPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const invalidateAfterRecord = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["balance"] }),
      queryClient.invalidateQueries({ queryKey: ["readContract"] }),
      queryClient.invalidateQueries({ queryKey: ["readContracts"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.transactions() }),
    ]);

  const reset = useCallback(() => {
    phaseRef.current = "idle";
    setPhaseState("idle");
    setUserFriendlyError(null);
    setLastTxHash(undefined);
    setLastStatusData(undefined);
    lastTransferRef.current = undefined;
    lastReceiptsRef.current = [];
    lastStatusRef.current = undefined;
  }, []);

  const failBeforeSend = (message: string): TxPhase => {
    setPhase("idle");
    setUserFriendlyError(message);
    callbacksRef.current.onError?.(message);
    callbacksRef.current.onSettled?.();
    return "idle";
  };

  const recordMined = async (receipts: readonly MinedReceipt[]): Promise<TxPhase> => {
    const statusData = toStatusData(receipts);
    lastStatusRef.current = statusData;
    setLastStatusData(statusData);
    const hash = receipts[receipts.length - 1]?.transactionHash;
    if (hash) setLastTxHash(hash);
    setPhase("recording");
    try {
      const transfer = lastTransferRef.current;
      if (transfer) {
        await postChainTransfer(transfer, receipts, chainIdRef.current);
      }
      try {
        await callbacksRef.current.onSuccess?.(statusData);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setUserFriendlyError(errorMsg);
        setPhase("recordFailed");
        await invalidateAfterRecord();
        return "recordFailed";
      }
      await invalidateAfterRecord();
      setUserFriendlyError(null);
      setPhase("confirmed");
      return "confirmed";
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUserFriendlyError(errorMsg);
      setPhase("recordFailed");
      return "recordFailed";
    } finally {
      callbacksRef.current.onSettled?.();
    }
  };

  const execute = async (calls: TransactionCall[], transfer?: ChainTransfer): Promise<TxPhase> => {
    if (txPhaseInFlight(phaseRef.current)) return phaseRef.current;

    if (!publicClient) {
      return failBeforeSend("Network client not available");
    }
    if (!walletsReady) {
      return failBeforeSend("Wallet is still initializing. Please try again in a moment.");
    }
    let smartWalletClient: Awaited<ReturnType<typeof getClientForChain>> | undefined;
    try {
      smartWalletClient = await getClientForChain({ id: chainId });
    } catch {
      smartWalletClient = undefined;
    }

    if (!smartWalletClient && !useSponsoredPrivyTx && !walletClient) {
      return failBeforeSend("Wallet not connected");
    }

    lastTransferRef.current = transfer;
    setUserFriendlyError(null);
    setLastTxHash(undefined);
    setLastStatusData(undefined);
    lastStatusRef.current = undefined;

    try {
      const receipts: MinedReceipt[] = [];

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
        setPhase("awaitingSignature");
        const hash = await smartWalletClient.sendTransaction({
          calls: batchCalls,
        });
        setPhase("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted");
        }
        receipts.push(receipt);
      } else {
        for (const call of calls) {
          setPhase("awaitingSignature");
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
          setPhase("confirming");
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") {
            throw new Error("Transaction reverted");
          }
          receipts.push(receipt);
        }
      }

      lastReceiptsRef.current = receipts;
      return await recordMined(receipts);
    } catch (error) {
      console.error("Error executing blockchain transaction:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUserFriendlyError(errorMsg);
      callbacksRef.current.onError?.(error instanceof Error ? error : new Error(String(error)));
      setPhase("chainFailed");
      callbacksRef.current.onSettled?.();
      return "chainFailed";
    }
  };

  const retrySave = async (): Promise<TxPhase> => {
    if (phaseRef.current !== "recordFailed") return phaseRef.current;
    const receipts = lastReceiptsRef.current;
    if (receipts.length === 0) return phaseRef.current;
    setUserFriendlyError(null);
    return recordMined(receipts);
  };

  return {
    execute,
    retrySave,
    phase,
    isProcessing: txPhaseInFlight(phase),
    isSending: phase === "awaitingSignature",
    isConfirming: phase === "confirming",
    isConfirmed: phase === "confirmed",
    isFailed: phase === "chainFailed" || phase === "recordFailed",
    transactionHash: lastTxHash,
    statusData: lastStatusData,
    error: userFriendlyError,
    reset,
  };
}
