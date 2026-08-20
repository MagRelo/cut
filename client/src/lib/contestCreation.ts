import { isAddress, type Hex } from "viem";
import { type ContestSettings, type CreateContestInput } from "../types/contest";
import { getContractAddress, getContractConfig } from "../utils/blockchainUtils.tsx";
import { primaryDepositWeiFromHuman } from "./paymentTokenSpend";

export const DEFAULT_EXPIRY_DAYS_AFTER_TOURNAMENT = 7;

/** Host-capped at 1000 (10%), same as `ContestController` / `referralNetworkBps`. */
export const MAX_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS = 1000;

/** Defaults aligned with contest settings + factory immutables (operator / referral stack). */
export function buildContestSettings(
  chainId: number,
  paymentTokenAddress: string,
  paymentTokenSymbol: string,
): ContestSettings {
  return {
    contestType: "PUBLIC",
    chainId,
    expiryTimestamp: 0,
    paymentTokenAddress,
    paymentTokenSymbol,
    operator: import.meta.env.VITE_OPERATOR_ADDRESS || "",
    primaryDeposit: 10,
    referralNetworkBps: Number(import.meta.env.VITE_REFERRAL_NETWORK_BPS) || 500,
    referralGroupId: import.meta.env.VITE_REFERRAL_GROUP_ID || "",
    primaryDepositSecondarySubsidyBps: Number(
      import.meta.env.VITE_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS ?? 0,
    ),
  };
}

export function computeExpiryTimestampFromTournamentEnd(
  tournamentEndDate: string | undefined,
  daysAfterEnd: number = DEFAULT_EXPIRY_DAYS_AFTER_TOURNAMENT,
): number {
  if (!tournamentEndDate) return 0;
  const ms = new Date(tournamentEndDate).getTime() + daysAfterEnd * 24 * 60 * 60 * 1000;
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 1000);
}

export function formatTournamentDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const start = new Date(startDate).toLocaleDateString(undefined, opts);
  const end = new Date(endDate).toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
}

export function resolveReferralGroupId(referralGroupId: string | undefined): Hex | null {
  const normalized = (referralGroupId?.startsWith("0x")
    ? referralGroupId
    : referralGroupId
      ? `0x${referralGroupId}`
      : "") as Hex;
  if (!normalized || normalized.length !== 66) return null;
  return normalized;
}

export function validateContestSettings(
  settings: ContestSettings,
  options?: { maxReferralNetworkBps?: number },
): string | null {
  const operator = settings.operator.trim();
  if (!operator || !isAddress(operator)) {
    return "Enter a valid operator address.";
  }

  const platformRoot = (
    getContractConfig(settings.chainId)?.referralPlatformRootAddress || ""
  ).trim();
  if (platformRoot && isAddress(platformRoot) && operator.toLowerCase() === platformRoot.toLowerCase()) {
    return "Operator cannot be the referral platform root. Settlement fees must not flow to the hot signing wallet.";
  }

  const maxReferralBps = options?.maxReferralNetworkBps ?? 1000;
  const referralBps = settings.referralNetworkBps ?? settings.oracleFeeBps ?? 0;
  if (referralBps < 0 || referralBps > maxReferralBps) {
    const maxPercent = maxReferralBps / 100;
    return `Invite rewards must be between 0 and ${maxPercent}% (${maxReferralBps} basis points).`;
  }

  if (
    settings.primaryDepositSecondarySubsidyBps < 0 ||
    settings.primaryDepositSecondarySubsidyBps > MAX_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS
  ) {
    return `Primary deposit secondary subsidy must be between 0 and ${MAX_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS / 100}% (${MAX_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS} basis points).`;
  }

  if (settings.expiryTimestamp <= 0) {
    return "A valid contest expiry is required for the active tournament.";
  }

  return null;
}

export type CreateContestFactoryCallParams = {
  primaryDepositAmount: bigint;
  referralNetworkBps: number;
  expiryTimestamp: bigint;
  primaryDepositSecondarySubsidyBps: number;
};

export function buildCreateContestFactoryCallParams(
  pending: CreateContestInput,
  chainId: number,
  paymentTokenAddress: string,
  options?: { maxReferralNetworkBps?: number },
): { params: CreateContestFactoryCallParams } | { error: string } {
  const settingsError = validateContestSettings(pending.settings, options);
  if (settingsError) {
    return { error: settingsError };
  }

  if (!paymentTokenAddress) {
    return { error: "Payment token is not configured." };
  }

  const referralGraph = getContractAddress(chainId, "referralGraphAddress");
  if (!referralGraph) {
    return { error: "Referral graph is not configured for this chain." };
  }

  const rewardCalculator = getContractAddress(chainId, "rewardCalculatorAddress");
  if (!rewardCalculator) {
    return { error: "Reward calculator is not configured for this chain." };
  }

  const referralGroupId = resolveReferralGroupId(pending.settings.referralGroupId);
  if (!referralGroupId) {
    return { error: "Referral group ID is not configured (VITE_REFERRAL_GROUP_ID)." };
  }

  const s = pending.settings;

  return {
    params: {
      primaryDepositAmount: primaryDepositWeiFromHuman(s.primaryDeposit),
      referralNetworkBps: s.referralNetworkBps ?? s.oracleFeeBps ?? 0,
      expiryTimestamp: BigInt(s.expiryTimestamp),
      primaryDepositSecondarySubsidyBps: s.primaryDepositSecondarySubsidyBps,
    },
  };
}
