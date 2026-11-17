import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { primaryDepositWeiFromSettings } from "../../lib/contractAddresses.js";
import {
  getReferralGraphAddress,
  getRewardCalculatorAddress,
  parseReferralGroupIdFromEnv,
} from "../../lib/referralConfig.js";
import { scheduleContestAnnouncementEmails } from "../../lib/email/send/contestAnnouncement.js";
import { invalidateContestDirectory } from "../contests/listContestDirectory.js";
import { invalidateContestLobby } from "../contests/getContestLobby.js";
import { queueVerifyContestContract } from "./verifyContestContract.js";
import {
  verifyFactoryContestCreation,
  type VerifyFactoryContestError,
} from "./verifyFactoryContestCreation.js";

export const FACTORY_CONTEST_VERIFY_MESSAGES: Record<VerifyFactoryContestError, string> = {
  receipt_not_found: "Transaction receipt not found",
  receipt_failed: "Transaction did not succeed",
  not_factory_contest: "Transaction did not create a contest from the configured factory",
  address_mismatch: "Contest address does not match the factory ContestCreated event",
  host_mismatch: "Contest host does not match this account",
  operator_mismatch: "Contest operator does not match the configured operator",
  token_mismatch: "Contest payment token does not match the configured token",
  rpc_error: "Failed to verify contest creation",
};

type ContestSettings = Record<string, unknown>;

export async function recordPaidContest(input: {
  name: string;
  description?: string | null | undefined;
  eventId: string;
  userGroupId?: string | null | undefined;
  endTime: Date;
  chainId: number;
  address: string;
  host: string;
  transactionHash: `0x${string}`;
  settings?: ContestSettings | null | undefined;
  notifyLeagueMembers?: boolean | undefined;
}): Promise<
  | { ok: true; contest: Prisma.ContestGetPayload<{ include: { event: true; userGroup: true } }> }
  | { ok: false; status: 400 | 403 | 409 | 502; error: string }
> {
  const factoryCheck = await verifyFactoryContestCreation({
    chainId: input.chainId,
    transactionHash: input.transactionHash,
    claimedAddress: input.address,
    host: input.host,
  });
  if (!factoryCheck.ok) {
    return {
      ok: false,
      status:
        factoryCheck.error === "rpc_error"
          ? 502
          : factoryCheck.error === "host_mismatch"
            ? 403
            : 400,
      error: FACTORY_CONTEST_VERIFY_MESSAGES[factoryCheck.error],
    };
  }

  const pinnedSettings: ContestSettings = {
    ...(input.settings ?? {}),
    operator: factoryCheck.operator,
    paymentTokenAddress: factoryCheck.paymentToken,
  };

  let contest: Prisma.ContestGetPayload<{ include: { event: true; userGroup: true } }>;
  try {
    contest = await prisma.contest.create({
      data: {
        name: input.name,
        description: input.description || null,
        eventId: input.eventId,
        userGroupId: input.userGroupId || null,
        endTime: input.endTime,
        address: factoryCheck.contestAddress,
        chainId: input.chainId,
        status: "OPEN",
        settings: pinnedSettings as Prisma.InputJsonValue,
      },
      include: {
        event: true,
        userGroup: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        status: 409,
        error: "A contest for this contract is already registered",
      };
    }
    throw error;
  }
  invalidateContestDirectory();
  invalidateContestLobby(contest);

  const bps =
    typeof pinnedSettings.primaryDepositSecondarySubsidyBps === "number"
      ? pinnedSettings.primaryDepositSecondarySubsidyBps
      : typeof pinnedSettings.primaryEntryInvestmentShareBps === "number"
        ? pinnedSettings.primaryEntryInvestmentShareBps
        : undefined;
  const referralNetworkBps =
    typeof pinnedSettings.referralNetworkBps === "number"
      ? pinnedSettings.referralNetworkBps
      : typeof pinnedSettings.oracleFeeBps === "number"
        ? pinnedSettings.oracleFeeBps
        : undefined;
  const referralGraphAddress = getReferralGraphAddress(input.chainId);
  const rewardCalculatorAddress = getRewardCalculatorAddress(input.chainId);
  const referralGroupIdRaw =
    typeof pinnedSettings.referralGroupId === "string"
      ? pinnedSettings.referralGroupId
      : parseReferralGroupIdFromEnv();
  const referralGroupId = referralGroupIdRaw as `0x${string}` | null;
  if (
    typeof pinnedSettings.primaryDeposit === "number" &&
    typeof referralNetworkBps === "number" &&
    typeof pinnedSettings.expiryTimestamp === "number" &&
    typeof bps === "number" &&
    referralGraphAddress &&
    rewardCalculatorAddress &&
    referralGroupId &&
    typeof pinnedSettings.paymentTokenAddress === "string" &&
    typeof pinnedSettings.operator === "string"
  ) {
    void queueVerifyContestContract({
      chainId: input.chainId,
      contestAddress: factoryCheck.contestAddress,
      paymentTokenAddress: pinnedSettings.paymentTokenAddress,
      operator: pinnedSettings.operator,
      primaryDepositAmountWei: primaryDepositWeiFromSettings(
        pinnedSettings.primaryDeposit,
        input.chainId,
      ).toString(),
      referralNetworkBps,
      expiryTimestamp: pinnedSettings.expiryTimestamp,
      primaryDepositSecondarySubsidyBps: bps,
      referralGraphAddress,
      rewardCalculatorAddress,
      referralGroupId,
    }).catch((err) => {
      console.error("Failed to queue contest contract verification:", err);
    });
  }

  await scheduleContestAnnouncementEmails({
    contestId: contest.id,
    eventId: contest.eventId,
    userGroupId: contest.userGroupId,
    notifyLeagueMembers: input.notifyLeagueMembers,
  });

  return { ok: true, contest };
}
