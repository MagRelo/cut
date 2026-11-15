import { getAddress, type Address } from "viem";
import { prisma } from "../../lib/prisma.js";
import {
  getPaymentTokenAddress,
  primaryDepositWeiFromSettings,
} from "../../lib/contractAddresses.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { resolveContestStatus } from "../../utils/resolveContestStatus.js";
import { isUserGroupMember } from "../../utils/userGroup.js";
import { createLineupForEvent } from "../lineups/createLineupForEvent.js";
import { updateLineupById } from "../lineups/updateLineupById.js";
import { getPublicClient } from "../shared/contractClient.js";
import { invalidateContestLobby } from "../contests/getContestLobby.js";
import type { BotActionDeps, BotLineup } from "./executeBotAction.js";
import { readSessionKeyEnabled } from "./sessionKeyEnabled.js";
import { prepareSessionKeyUserOp, submitSessionKeyUserOp } from "./submitSessionKeyUserOp.js";

const depositAbi = [
  {
    type: "function",
    name: "primaryDepositAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "paymentToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

function toLineup(row: {
  id: string;
  userId: string;
  eventId: string;
  contestId: string | null;
  picks: { eventParticipantId: string }[];
}): BotLineup {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    contestId: row.contestId,
    picks: row.picks.map((pick) => pick.eventParticipantId),
  };
}

export function createBotActionDeps(): BotActionDeps {
  return {
    findDelegate: async (smartWallet, signer) => {
      const row = await prisma.botDelegate.findFirst({
        where: {
          smartWallet: smartWallet.toLowerCase(),
          delegateAddress: signer.toLowerCase(),
          status: "active",
        },
      });
      if (!row || (row.kind !== "cut_bot" && row.kind !== "external")) return null;
      return {
        userId: row.userId,
        smartWallet: row.smartWallet,
        delegateAddress: row.delegateAddress,
        kind: row.kind,
        approval: row.approval,
      };
    },
    sessionEnabled: readSessionKeyEnabled,
    loadContest: async (contestId) => {
      const contest = await prisma.contest.findUnique({ where: { id: contestId } });
      if (!contest) return null;
      const status = await resolveContestStatus(contest);
      let paymentToken = getPaymentTokenAddress(contest.chainId);
      let depositWei = 0n;
      const deposit = primaryDepositFromSettings(contest.settings);
      if (typeof deposit === "number") {
        depositWei = primaryDepositWeiFromSettings(deposit, contest.chainId);
      }
      if (contest.address) {
        try {
          const publicClient = getPublicClient(contest.chainId);
          const [onchainDeposit, onchainToken] = await Promise.all([
            publicClient.readContract({
              address: contest.address as Address,
              abi: depositAbi,
              functionName: "primaryDepositAmount",
            }),
            publicClient.readContract({
              address: contest.address as Address,
              abi: depositAbi,
              functionName: "paymentToken",
            }),
          ]);
          depositWei = onchainDeposit;
          paymentToken = getAddress(onchainToken);
        } catch (error) {
          console.error("bot loadContest chain read:", error);
        }
      }
      return {
        id: contest.id,
        eventId: contest.eventId,
        userGroupId: contest.userGroupId,
        address: contest.address,
        chainId: contest.chainId,
        status,
        paymentToken,
        depositWei,
      };
    },
    isGroupMember: isUserGroupMember,
    findLineup: async (lineupId) => {
      const row = await prisma.lineup.findUnique({
        where: { id: lineupId },
        include: { picks: true },
      });
      return row ? toLineup(row) : null;
    },
    findLineupByPicks: async (userId, contestId, picks) => {
      const rows = await prisma.lineup.findMany({
        where: { userId, contestId },
        include: { picks: true },
      });
      const match = rows.find((row) => {
        const ids = row.picks.map((pick) => pick.eventParticipantId);
        return ids.length === picks.length && ids.every((id, index) => id === picks[index]);
      });
      return match ? toLineup(match) : null;
    },
    createLineup: async ({ userId, contest, picks, prediction }) => {
      const result = await createLineupForEvent({
        userId,
        eventId: contest.eventId,
        picks,
        contestId: contest.id,
        ...(prediction !== undefined ? { prediction } : {}),
      });
      if ("lineup" in result && result.lineup) {
        return {
          ok: true,
          lineup: {
            id: result.lineup.id,
            userId,
            eventId: result.lineup.eventId,
            contestId: result.lineup.contestId,
            picks: result.lineup.picks.map((pick) => pick.eventParticipantId),
          },
        };
      }
      if (result.error === "duplicate") {
        return { ok: false, error: result.message };
      }
      if (result.error === "validation") {
        return { ok: false, error: result.messages.join(", ") };
      }
      if (result.error === "not_editable") {
        const body = result.body as { error?: string };
        return { ok: false, error: body.error ?? "Lineup is not editable" };
      }
      return { ok: false, error: "Could not create lineup" };
    },
    findContestEntry: async (contestId, lineupId) => {
      return prisma.contestLineup.findFirst({
        where: { contestId, lineupId },
        select: { id: true },
      });
    },
    insertContestEntry: async (input) => {
      await prisma.contestLineup.create({
        data: {
          contestId: input.contestId,
          lineupId: input.lineupId,
          userId: input.userId,
          entryId: input.entryId,
          status: "ACTIVE",
        },
      });
      invalidateContestLobby({ id: input.contestId });
    },
    deleteContestEntry: async (contestId, lineupId, userId) => {
      const deleted = await prisma.contestLineup.deleteMany({
        where: { contestId, lineupId, userId },
      });
      invalidateContestLobby({ id: contestId });
      return deleted.count > 0;
    },
    updateLineup: async (input) => {
      const result = await updateLineupById(input);
      if ("lineup" in result && result.lineup) return { ok: true };
      if (result.error === "duplicate") return { ok: false, error: result.message };
      if (result.error === "validation") return { ok: false, error: result.messages.join(", ") };
      if (result.error === "not_editable") {
        const body = result.body as { error?: string };
        return { ok: false, error: body.error ?? "Lineup is not editable" };
      }
      return { ok: false, error: "Lineup not found" };
    },
    prepareUserOp: async (input) => prepareSessionKeyUserOp(input),
    submitCalls: async (input) => {
      const result = await submitSessionKeyUserOp(input);
      if (!result.ok) return result;
      return { ok: true };
    },
    log: async (userId, action, error) => {
      await prisma.botActionLog.create({
        data: {
          userId,
          action,
          ...(error ? { error } : {}),
        },
      });
    },
  };
}
