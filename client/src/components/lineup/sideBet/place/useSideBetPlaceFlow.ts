import { useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { usePlaceSideBetTicketMutation } from "../../../../hooks/useSideBetQueries";
import type { BatchTransactionStatusData } from "../../../../hooks/useBlockchainTransaction";
import type { SideBetMarketSelectionDto } from "../../../../types/sideBet";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTransferTokens } from "../../../../hooks/useTokenOperations";
import { ApiError } from "../../../../utils/apiError";
import { PAYMENT_TOKEN_DECIMALS } from "../../../../lib/paymentTokenSpend";
import {
  MAX_TICKET_PAYOUT_USD,
  MIN_STAKE,
  PARLAY_MARKET_UNAVAILABLE,
} from "../shared/sideBetConstants";
import { formatStakeInputLine, formatUsd } from "../shared/sideBetFormatters";

export interface UseSideBetPlaceFlowOptions {
  lineupId: string | null;
  activeSelection: SideBetMarketSelectionDto | null;
  stakeInput: string;
  bettable: boolean;
  onSuccess: () => void;
}

export function useSideBetPlaceFlow({
  lineupId,
  activeSelection,
  stakeInput,
  bettable,
  onSuccess,
}: UseSideBetPlaceFlowOptions) {
  const [placeError, setPlaceError] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const { paymentTokenBalance, paymentTokenDecimals, balancesUnavailable } = useAuth();

  const resolvedStakeDecimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const paymentBalance = paymentTokenBalance ?? 0n;

  const pendingSideBetRef = useRef<{
    lineupId: string;
    hitsRequired: number;
    topN: number;
    stakeAmount: number;
  } | null>(null);

  const placeMutation = usePlaceSideBetTicketMutation(lineupId);

  const {
    execute,
    isProcessing: isPayingOracle,
    error: paymentTxError,
    createTransferCalls,
  } = useTransferTokens({
    tokenDecimals: resolvedStakeDecimals,
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      const pending = pendingSideBetRef.current;
      pendingSideBetRef.current = null;
      if (!pending) return;
      const transactionHashes = statusData.receipts.map((r) => r.transactionHash);
      try {
        const result = await placeMutation.mutateAsync({
          ...pending,
          ...(transactionHashes.length > 0 ? { transactionHashes } : {}),
        });
        if (result.status === "REFUND_PENDING") {
          setPlaceError(
            "Your stake was sent on-chain, but this parlay could not be booked at current prices. A refund-pending entry was saved on your ticket list—contact support if you need a manual refund.",
          );
          return;
        }
        onSuccess();
      } catch (e: unknown) {
        setPlaceError(e instanceof ApiError ? e.message : PARLAY_MARKET_UNAVAILABLE);
      }
    },
    onError: () => {
      pendingSideBetRef.current = null;
    },
  });

  const payoutPreview = useMemo(() => {
    if (!activeSelection) return null;
    const trimmed = stakeInput.trim();
    let stakeBn: bigint;
    try {
      stakeBn = parseUnits(trimmed, resolvedStakeDecimals);
    } catch {
      return null;
    }
    const minBn = parseUnits(MIN_STAKE, resolvedStakeDecimals);
    if (stakeBn < minBn) return null;
    const stake = parseFloat(trimmed);
    const d = activeSelection.decimalOdds;
    if (!Number.isFinite(stake) || !Number.isFinite(d) || d <= 1) return null;
    return { totalReturn: stake * d, profit: stake * (d - 1) };
  }, [activeSelection, stakeInput, resolvedStakeDecimals]);

  const exceedsMaxTicketPayout =
    payoutPreview !== null && payoutPreview.totalReturn >= MAX_TICKET_PAYOUT_USD;

  const modalStakeTicketLine = useMemo(
    () => formatStakeInputLine(stakeInput),
    [stakeInput],
  );

  const clearPlaceError = () => setPlaceError(null);

  const placeTicket = async () => {
    if (!activeSelection || !lineupId) return;
    if (!bettable) {
      setPlaceError(PARLAY_MARKET_UNAVAILABLE);
      return;
    }
    const amountStr = stakeInput.trim();
    let stakeUnits: bigint;
    try {
      stakeUnits = parseUnits(amountStr, resolvedStakeDecimals);
    } catch {
      setPlaceError("Enter a valid stake.");
      return;
    }
    if (stakeUnits <= 0n) {
      setPlaceError("Enter a valid stake.");
      return;
    }
    const minStakeWei = parseUnits(MIN_STAKE, resolvedStakeDecimals);
    if (stakeUnits < minStakeWei) {
      setPlaceError("Minimum stake is $0.01 (one cent).");
      return;
    }
    const stakeAmount = Number.parseFloat(amountStr);
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
      setPlaceError("Enter a valid stake.");
      return;
    }

    const totalReturnIfWin = stakeAmount * activeSelection.decimalOdds;
    if (Number.isFinite(totalReturnIfWin) && totalReturnIfWin >= MAX_TICKET_PAYOUT_USD) {
      setPlaceError(
        `Total return must stay under ${formatUsd(MAX_TICKET_PAYOUT_USD)} for a single ticket. Lower your stake.`,
      );
      return;
    }

    const stakeRecipient = import.meta.env.VITE_SIDE_BET_STAKE_RECIPIENT?.trim() ?? "";
    if (!stakeRecipient || !isAddress(stakeRecipient)) {
      setPlaceError(
        "Side bet stake recipient is not configured (VITE_SIDE_BET_STAKE_RECIPIENT).",
      );
      return;
    }
    if (!isConnected) {
      setPlaceError("Connect your wallet to pay the stake.");
      return;
    }
    if (balancesUnavailable) {
      setPlaceError("Could not load balances. Try again from Account.");
      return;
    }

    if (stakeUnits > paymentBalance) {
      setPlaceError("Insufficient balance for this stake. Add funds in Account if needed.");
      return;
    }

    setPlaceError(null);
    pendingSideBetRef.current = {
      lineupId,
      hitsRequired: activeSelection.hitsRequired,
      topN: activeSelection.topN,
      stakeAmount,
    };

    try {
      const calls = createTransferCalls(stakeRecipient, amountStr);
      await execute(calls);
    } catch (e: unknown) {
      pendingSideBetRef.current = null;
      setPlaceError(e instanceof Error ? e.message : "Could not prepare payment.");
    }
  };

  return {
    placeTicket,
    placeError,
    clearPlaceError,
    paymentTxError,
    isPayingOracle,
    isRecording: placeMutation.isPending,
    payoutPreview,
    exceedsMaxTicketPayout,
    modalStakeTicketLine,
  };
};
