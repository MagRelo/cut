import { useCallback, useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import type { Contest } from "../types/contest";
import { useAuth } from "../contexts/AuthContext";
import { useLineupData } from "./useLineupData";
import { useJoinContest, useLeaveContest } from "./useContestMutations";
import {
  useJoinContest as useJoinContestBlockchain,
  useLeaveContest as useLeaveContestBlockchain,
} from "./useContestantOperations";
import { generateEntryId } from "../utils/entryIdUtils";
import { captureContestEntryRecorded } from "../lib/analytics/posthog";
import type { BatchTransactionStatusData } from "./useBlockchainTransaction";
import { hasEnoughTokenBalance } from "../lib/paymentTokenSpend";
import {
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";
import ContestContract from "../utils/contracts/ContestController.json";

export function useContestLineupEntry(contest: Contest) {
  const posthog = usePostHog();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { user, paymentTokenBalance, balancesUnavailable } = useAuth();
  const joinContest = useJoinContest();
  const leaveContest = useLeaveContest();
  const { lineups } = useLineupData({ eventId: contest.eventId });

  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "join" | "leave";
    lineupId: string;
    entryId?: string;
  } | null>(null);

  const userContestLineups = useMemo(
    () => contest.contestLineups?.filter((lineup) => lineup.userId === user?.id) ?? [],
    [contest.contestLineups, user?.id],
  );

  const enteredLineupsMap = useMemo(() => {
    const map = new Map<string, string>();
    userContestLineups.forEach((cl) => {
      if (cl.lineupId) map.set(cl.lineupId, cl.id);
    });
    return map;
  }, [userContestLineups]);

  const { data: primaryDepositRaw, isPending: isPrimaryDepositLoading } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositAmount",
    args: [],
  });
  const contestantDepositAmount =
    typeof primaryDepositRaw === "bigint" ? primaryDepositRaw : undefined;

  const { data: contestPaymentTokenOnChain } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    args: [],
    query: { enabled: Boolean(contest.address) },
  });

  const contestPaymentToken =
    (typeof contestPaymentTokenOnChain === "string"
      ? contestPaymentTokenOnChain
      : contest.settings?.paymentTokenAddress) ?? "";

  const { data: contestTokenBalanceData } = useBalance({
    address: balanceAddress,
    token: contestPaymentToken as `0x${string}`,
    query: {
      enabled: Boolean(balanceAddress && contestPaymentToken && user),
    },
  });

  const spendableForContest = contestTokenBalanceData?.value ?? paymentTokenBalance ?? 0n;

  const hasEnoughBalance = useMemo(() => {
    if (contestantDepositAmount === undefined) return false;
    if (contestantDepositAmount === 0n) return true;
    return hasEnoughTokenBalance(spendableForContest, contestantDepositAmount);
  }, [spendableForContest, contestantDepositAmount]);

  const checkForDuplicateInContest = useCallback(
    (lineupId: string): boolean => {
      const lineup = lineups.find((l) => l.id === lineupId);
      if (!lineup) return false;

      const normalizedPicks = platformLineupEventParticipantIds(lineup).sort().join(",");
      const prediction = platformLineupPrediction(lineup);

      return (
        contest.contestLineups?.some((contestLineup) => {
          if (contestLineup.userId !== user?.id) return false;
          const contestPlatformLineup = lineups.find((l) => l.id === contestLineup.lineupId);
          if (!contestPlatformLineup) return false;
          const contestPicks = platformLineupEventParticipantIds(contestPlatformLineup)
            .sort()
            .join(",");
          return (
            contestPicks === normalizedPicks &&
            platformLineupPrediction(contestPlatformLineup) === prediction
          );
        }) ?? false
      );
    },
    [lineups, contest.contestLineups, user?.id],
  );

  const {
    execute: executeJoinBlockchain,
    isSending: isJoinSending,
    isConfirming: isJoinConfirming,
    isFailed: isJoinFailed,
    error: joinError,
    createJoinContestCalls,
  } = useJoinContestBlockchain({
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      if (
        pendingAction?.type === "join" &&
        pendingAction.entryId &&
        user?.id &&
        pendingAction.lineupId
      ) {
        const txHash = statusData.receipts[0]?.transactionHash;
        captureContestEntryRecorded(posthog, {
          user_id: user.id,
          contest_id: contest.id,
          entry_id: pendingAction.entryId,
          chain_id: contest.chainId,
          transaction_hash: txHash,
        });
      }
      if (pendingAction?.type === "join" && pendingAction.lineupId && pendingAction.entryId) {
        try {
          await joinContest.mutateAsync({
            contestId: contest.id,
            lineupId: pendingAction.lineupId,
            entryId: pendingAction.entryId,
          });
          setPendingAction(null);
          setServerError(null);
        } catch (error) {
          setServerError(
            `Failed to join contest: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          setPendingAction(null);
        }
      }
    },
    onError: () => {
      setServerError("Blockchain transaction failed. Please try again.");
      setPendingAction(null);
    },
  });

  const {
    execute: executeLeaveBlockchain,
    isSending: isLeaveSending,
    isConfirming: isLeaveConfirming,
    isFailed: isLeaveFailed,
    error: leaveError,
    createLeaveContestCalls,
  } = useLeaveContestBlockchain({
    onSuccess: async () => {
      if (pendingAction?.type === "leave" && pendingAction.lineupId) {
        try {
          const contestLineupId = enteredLineupsMap.get(pendingAction.lineupId);
          if (contestLineupId) {
            await leaveContest.mutateAsync({
              contestId: contest.id,
              contestLineupId,
            });
          }
          setPendingAction(null);
          setServerError(null);
        } catch (error) {
          setServerError(
            `Failed to leave contest: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          setPendingAction(null);
        }
      }
    },
    onError: () => {
      setServerError("Blockchain transaction failed. Please try again.");
      setPendingAction(null);
    },
  });

  const joinPrimaryDepositLabel =
    contest.settings?.primaryDeposit === 0 ? "Free" : `$${contest.settings?.primaryDeposit ?? 0}`;

  const handleJoinContest = async (lineupId: string) => {
    const lineup = lineups.find((l) => l.id === lineupId);
    if (!lineup || platformLineupEventParticipantIds(lineup).length === 0) {
      setValidationError("Lineup must have at least 1 player");
      return;
    }
    if (checkForDuplicateInContest(lineupId)) {
      setValidationError(
        "You already have a lineup with these players and tie-breaker in this contest",
      );
      return;
    }
    setValidationError(null);
    if (isPrimaryDepositLoading) return;
    if (contestantDepositAmount === undefined) {
      setSubmissionError("Unable to read contest details from blockchain");
      return;
    }
    if (balancesUnavailable) {
      setSubmissionError(
        "Could not load your wallet balance. Check your connection and try again from Account.",
      );
      return;
    }
    if (!hasEnoughBalance) {
      setWarningMessage("You do not have enough funds to join this contest.");
      return;
    }

    const entryId = generateEntryId(contest.address, lineupId);
    setPendingAction({ type: "join", lineupId, entryId: entryId.toString() });
    setSubmissionError(null);

    const calls = createJoinContestCalls(
      contest.address,
      entryId,
      contestantDepositAmount,
      contestPaymentToken,
    );
    await executeJoinBlockchain(calls);
  };

  const handleLeaveContest = async (lineupId: string) => {
    setSubmissionError(null);
    const contestLineup = contest.contestLineups?.find(
      (cl) => cl.lineupId === lineupId && cl.userId === user?.id,
    );
    if (!contestLineup?.entryId) {
      setSubmissionError("Entry ID not found. Cannot leave contest.");
      return;
    }
    setPendingAction({ type: "leave", lineupId });
    const calls = createLeaveContestCalls(contest.address, Number(contestLineup.entryId));
    await executeLeaveBlockchain(calls);
  };

  const isLineupProcessing = (lineupId: string) =>
    pendingAction?.lineupId === lineupId && (isJoinSending || isJoinConfirming || isLeaveSending || isLeaveConfirming);

  return {
    enteredLineupsMap,
    joinPrimaryDepositLabel,
    handleJoinContest,
    handleLeaveContest,
    isLineupProcessing,
    isPrimaryDepositLoading,
    validationError,
    submissionError,
    serverError,
    warningMessage,
    clearWarningMessage: () => setWarningMessage(null),
    transactionError: joinError || leaveError,
    isFailed: isJoinFailed || isLeaveFailed,
    hasPlayers: (lineupId: string) => {
      const lineup = lineups.find((l) => l.id === lineupId);
      return Boolean(lineup && platformLineupEventParticipantIds(lineup).length > 0);
    },
  };
}
