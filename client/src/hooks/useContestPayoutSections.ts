import { useMemo } from "react";
import type {
  Contest,
  OnchainPaymentView,
  DetailedResult,
  SecondaryPayoutResult,
  RewardsPayoutResult,
} from "../types/contest";
import { getContractConfig } from "../utils/blockchainUtils";

const PLATFORM_ROOT_DISPLAY_NAME = "👤 Rich Bouquet";
/** Tailwind slate-500 — left-border highlight for platform-root referral payouts. */
const PLATFORM_ROOT_DISPLAY_COLOR = "#64748b";

function amountWei(p: { amountWei: string }): bigint {
  try {
    return BigInt(p.amountWei);
  } catch {
    return 0n;
  }
}

function primaryAmountWei(r: DetailedResult): string {
  try {
    const p = BigInt(r.payoutAmountWei ?? "0");
    const b = BigInt(r.positionBonusAmountWei ?? "0");
    return (p + b).toString();
  } catch {
    return "0";
  }
}

function mapDetailedResultToPrimaryRow(r: DetailedResult): OnchainPaymentView {
  return {
    kind: "PRIMARY",
    amountWei: primaryAmountWei(r),
    walletAddress: "",
    username: r.username,
    userColor: r.userColor,
    entryId: r.entryId,
    position: r.position,
    score: r.score,
    playerLastNames: r.playerLastNames,
    lineupName: r.lineupName,
    prediction: r.prediction,
    predictionDistance: r.predictionDistance,
  };
}

function primaryFromLegacy(detailedResults: DetailedResult[]) {
  const paidWinners = detailedResults
    .filter((r) => r.payoutBasisPoints > 0)
    .map(mapDetailedResultToPrimaryRow)
    .filter((r) => BigInt(r.amountWei) > 0n);

  if (paidWinners.length > 0) {
    return paidWinners;
  }

  // Free / zero-pool contests: show full final standings (same row shape, $0 payouts).
  return detailedResults.map(mapDetailedResultToPrimaryRow);
}

function secondaryFromLegacy(rows: SecondaryPayoutResult[]): OnchainPaymentView[] {
  return rows.map((r) => ({
    kind: "SECONDARY" as const,
    amountWei: r.amountWei,
    walletAddress: r.walletAddress,
    username: r.username,
    userColor: r.userColor,
    entryId: r.entryId,
    shareBps: r.shareBps,
  }));
}

function referralFromLegacy(rows: RewardsPayoutResult[]): OnchainPaymentView[] {
  return rows.map((r) => ({
    kind: "REFERRAL" as const,
    amountWei: r.amountWei,
    walletAddress: r.walletAddress,
    username: r.username,
    userColor: r.userColor,
    entryId: r.entryId,
  }));
}

function labelPlatformRoot(row: OnchainPaymentView, chainId: number): OnchainPaymentView {
  const root = getContractConfig(chainId)?.referralPlatformRootAddress;
  if (!root || row.walletAddress.toLowerCase() !== root.toLowerCase()) {
    return row;
  }
  if (
    row.username === PLATFORM_ROOT_DISPLAY_NAME &&
    row.userColor === PLATFORM_ROOT_DISPLAY_COLOR
  ) {
    return row;
  }
  return {
    ...row,
    username: PLATFORM_ROOT_DISPLAY_NAME,
    userColor: PLATFORM_ROOT_DISPLAY_COLOR,
  };
}

export function computeContestPayoutSections(contest: Contest) {
  const ledger = contest.onchainPayments ?? [];
  const useLedger = ledger.length > 0;

  const detailedResults = contest.results?.detailedResults ?? [];

  let primary: OnchainPaymentView[] = useLedger
    ? ledger.filter((p) => p.kind === "PRIMARY")
    : primaryFromLegacy(detailedResults);

  if (primary.length === 0 && detailedResults.length > 0) {
    primary = detailedResults.map(mapDetailedResultToPrimaryRow);
  }

  if (detailedResults.length > 0) {
    const byEntryId = new Map(detailedResults.map((r) => [r.entryId, r]));
    primary = primary.map((row) => {
      const detail = row.entryId ? byEntryId.get(row.entryId) : undefined;
      if (!detail) return row;
      return {
        ...row,
        prediction: row.prediction ?? detail.prediction,
        predictionDistance: row.predictionDistance ?? detail.predictionDistance,
      };
    });
  }

  const secondary: OnchainPaymentView[] = useLedger
    ? ledger.filter((p) => p.kind === "SECONDARY")
    : secondaryFromLegacy(contest.results?.secondaryPayouts ?? []);

  const referral: OnchainPaymentView[] = (
    useLedger
      ? ledger.filter((p) => p.kind === "REFERRAL")
      : referralFromLegacy(contest.results?.rewardsPayouts ?? [])
  ).map((row) => labelPlatformRoot(row, contest.chainId));

  const sortPrimary = [...primary].sort((a, b) => {
    const pa = a.position ?? 999;
    const pb = b.position ?? 999;
    if (pa !== pb) return pa - pb;
    return (a.entryId ?? "").localeCompare(b.entryId ?? "");
  });

  const sortByAmountDesc = (rows: OnchainPaymentView[]) =>
    [...rows].sort((a, b) => {
      const wa = amountWei(a);
      const wb = amountWei(b);
      if (wa === wb) return a.walletAddress.localeCompare(b.walletAddress);
      return wa < wb ? 1 : -1;
    });

  return {
    primary: sortPrimary,
    secondary: sortByAmountDesc(secondary),
    referral: sortByAmountDesc(referral),
    hasAnyRows: primary.length > 0 || secondary.length > 0 || referral.length > 0,
  };
}

export function useContestPayoutSections(contest: Contest) {
  return useMemo(
    () => computeContestPayoutSections(contest),
    [contest.onchainPayments, contest.results, contest.chainId],
  );
}
