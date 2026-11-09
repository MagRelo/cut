import { useCallback, useEffect, useMemo, useState } from "react";
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
import { txPhaseInFlight, type TxPhase } from "../lib/txPhase";
import { hasEnoughTokenBalance } from "../lib/paymentTokenSpend";
import {
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";
import ContestContract from "../utils/contracts/ContestController.json";
import { contestRouteKey, hasOnchainEscrow } from "../lib/hasOnchainEscrow";

export function useContestLineupEntry(contest: Contest) {
  const posthog = usePostHog();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { user, paymentTokenBalance, balancesUnavailable } = useAuth();
  const joinContest = useJoinContest();
  const leaveContest = useLeaveContest();
  const { lineups } = useLineupData({ eventId: contest.eventId });
  const onchain = hasOnchainEscrow(contest);
  const routeKey = contestRouteKey(contest);

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

  const { data: primaryDepositRaw, isPending: isPrimaryDepositLoadingOnChain } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositAmount",
    args: [],
    query: { enabled: onchain },
  });
  const isPrimaryDepositLoading = onchain && isPrimaryDepositLoadingOnChain;
  const contestantDepositAmount =
    typeof primaryDepositRaw === "bigint" ? primaryDepositRaw : undefined;

  const { data: contestPaymentTokenOnChain } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    args: [],
    query: {
      enabled: Boolean(onchain && contest.address),
    },
  });

  const contestPaymentToken =
    (typeof contestPaymentTokenOnChain === "string"
      ? contestPaymentTokenOnChain
      : contest.settings?.paymentTokenAddress) ?? "";

  const { data: contestTokenBalanceData } = useBalance({
    address: balanceAddress,
    token: contestPaymentToken as `0x${string}`,
    query: {
      enabled: Boolean(onchain && balanceAddress && contestPaymentToken && user),
    },
  });

  const spendableForContest = contestTokenBalanceData?.value ?? paymentTokenBalance ?? 0n;

  const hasEnoughBalance = useMemo(() => {
    if (!onchain) return true;
    if (contestantDepositAmount === undefined) return false;
    return hasEnoughTokenBalance(spendableForContest, contestantDepositAmount);
  }, [onchain, spendableForContest, contestantDepositAmount]);

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
    phase: joinPhase,
    error: joinError,
    retrySave: retryJoinSave,
    createJoinContestCalls,
  } = useJoinContestBlockchain({
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      if (pendingAction?.type !== "join" || !pendingAction.lineupId || !pendingAction.entryId) {
        throw new Error("Join did not finish saving");
      }
      if (user?.id) {
        const txHash = statusData.receipts[0]?.transactionHash;
        captureContestEntryRecorded(posthog, {
          user_id: user.id,
          contest_id: contest.id,
          entry_id: pendingAction.entryId,
          chain_id: contest.chainId,
          transaction_hash: txHash,
        });
      }
      await joinContest.mutateAsync({
        contestId: contest.id,
        contestRouteKey: routeKey,
        lineupId: pendingAction.lineupId,
        entryId: pendingAction.entryId,
      });
      setServerError(null);
    },
  });

  const {
    execute: executeLeaveBlockchain,
    phase: leavePhase,
    error: leaveError,
    retrySave: retryLeaveSave,
    createLeaveContestCalls,
  } = useLeaveContestBlockchain({
    onSuccess: async () => {
      if (pendingAction?.type !== "leave" || !pendingAction.lineupId) {
        throw new Error("Leave did not finish saving");
      }
      const contestLineupId = enteredLineupsMap.get(pendingAction.lineupId);
      if (!contestLineupId) {
        throw new Error("Entry not found. Cannot leave contest.");
      }
      await leaveContest.mutateAsync({
        contestId: contest.id,
        contestRouteKey: routeKey,
        contestLineupId,
      });
      setServerError(null);
    },
  });

  useEffect(() => {
    if (
      joinPhase === "confirmed" &&
      pendingAction?.type === "join" &&
      enteredLineupsMap.has(pendingAction.lineupId)
    ) {
      setPendingAction(null);
    }
  }, [joinPhase, pendingAction, enteredLineupsMap]);

  useEffect(() => {
    if (
      leavePhase === "confirmed" &&
      pendingAction?.type === "leave" &&
      !enteredLineupsMap.has(pendingAction.lineupId)
    ) {
      setPendingAction(null);
    }
  }, [leavePhase, pendingAction, enteredLineupsMap]);

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
    setSubmissionError(null);

    if (!hasOnchainEscrow(contest)) {
      setPendingAction({ type: "join", lineupId });
      try {
        await joinContest.mutateAsync({
          contestId: contest.id,
          contestRouteKey: routeKey,
          lineupId,
        });
        setPendingAction(null);
        setServerError(null);
      } catch (error) {
        setServerError(
          `Failed to join contest: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setPendingAction(null);
      }
      return;
    }

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

    if (!balanceAddress || !contest.address || !contestPaymentToken) {
      setSubmissionError("Wallet not connected");
      return;
    }

    const entryId = generateEntryId(contest.address, lineupId);
    const entryIdText = entryId.toString();
    setPendingAction({ type: "join", lineupId, entryId: entryIdText });

    const calls = createJoinContestCalls(
      contest.address,
      entryId,
      contestantDepositAmount,
      contestPaymentToken,
    );
    const outcome = await executeJoinBlockchain(calls, {
      kind: "ENTRY",
      tokenAddress: contestPaymentToken as `0x${string}`,
      amountWei: contestantDepositAmount.toString(),
      from: balanceAddress,
      to: contest.address as `0x${string}`,
      contestId: contest.id,
      entryId: entryIdText,
      lineupId,
    });
    if (outcome === "idle") setPendingAction(null);
  };

  const handleLeaveContest = async (lineupId: string) => {
    setSubmissionError(null);
    const contestLineup = contest.contestLineups?.find(
      (cl) => cl.lineupId === lineupId && cl.userId === user?.id,
    );
    const contestLineupId = contestLineup?.id ?? enteredLineupsMap.get(lineupId);
    if (!contestLineupId) {
      setSubmissionError("Entry not found. Cannot leave contest.");
      return;
    }

    if (!hasOnchainEscrow(contest)) {
      setPendingAction({ type: "leave", lineupId });
      try {
        await leaveContest.mutateAsync({
          contestId: contest.id,
          contestRouteKey: routeKey,
          contestLineupId,
        });
        setPendingAction(null);
        setServerError(null);
      } catch (error) {
        setServerError(
          `Failed to leave contest: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setPendingAction(null);
      }
      return;
    }

    if (!contestLineup?.entryId) {
      setSubmissionError("Entry ID not found. Cannot leave contest.");
      return;
    }
    if (
      !balanceAddress ||
      !contest.address ||
      !contestPaymentToken ||
      contestantDepositAmount === undefined
    ) {
      setSubmissionError("Unable to read contest details from blockchain");
      return;
    }
    setPendingAction({ type: "leave", lineupId });
    const calls = createLeaveContestCalls(contest.address, Number(contestLineup.entryId));
    const outcome = await executeLeaveBlockchain(calls, {
      kind: "REFUND",
      tokenAddress: contestPaymentToken as `0x${string}`,
      amountWei: contestantDepositAmount.toString(),
      from: contest.address as `0x${string}`,
      to: balanceAddress,
      contestId: contest.id,
      entryId: contestLineup.entryId,
      lineupId,
    });
    if (outcome === "idle") setPendingAction(null);
  };

  const lineupPhase = (lineupId: string): TxPhase => {
    if (pendingAction?.lineupId !== lineupId) return "idle";
    return pendingAction.type === "join" ? joinPhase : leavePhase;
  };

  const lineupTxError = (lineupId: string): string | null => {
    if (pendingAction?.lineupId !== lineupId) return null;
    const phase = pendingAction.type === "join" ? joinPhase : leavePhase;
    if (phase !== "chainFailed" && phase !== "recordFailed") return null;
    return pendingAction.type === "join" ? joinError : leaveError;
  };

  const retryLineupSave = (lineupId: string) => {
    if (pendingAction?.lineupId !== lineupId) return;
    if (pendingAction.type === "join") void retryJoinSave();
    else void retryLeaveSave();
  };

  const isLineupProcessing = (lineupId: string) =>
    pendingAction?.lineupId === lineupId &&
    ((pendingAction.type === "join" && txPhaseInFlight(joinPhase)) ||
      (pendingAction.type === "leave" && txPhaseInFlight(leavePhase)) ||
      joinContest.isPending ||
      leaveContest.isPending);

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
    lineupPhase,
    lineupTxError,
    retryLineupSave,
    transactionError: pendingAction ? null : joinError || leaveError,
    isFailed: joinPhase === "chainFailed" || joinPhase === "recordFailed" || leavePhase === "chainFailed" || leavePhase === "recordFailed",
    hasPlayers: (lineupId: string) => {
      const lineup = lineups.find((l) => l.id === lineupId);
      return Boolean(lineup && platformLineupEventParticipantIds(lineup).length > 0);
    },
  };
}
