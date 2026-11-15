import { getAddress, isAddress, type Address, type Hex } from "viem";
import type { Candidate } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { getEventCandidates } from "../events/getEventCandidates.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { contestVisibilityWhere } from "../../utils/contestListQuery.js";
import {
  assertDeadline,
  recoverBotReadSigner,
  type BotReadMessage,
} from "./botActionSignature.js";

/**
 * ERC-8128 spec version: draft-2026-01-16
 * Reads are replayable (no nonce requirement) since they don't modify state.
 */

export type BotContestListItem = {
  contestId: string;
  name: string;
  eventId: string;
  sportId: string;
  chainId: number;
  status: string;
  address: string | null;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  candidates: Candidate[];
};

type ContestRow = {
  id: string;
  name: string;
  eventId: string;
  sportId: string;
  chainId: number;
  status: string;
  address: string | null;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: Date;
};

export type ListBotContestsDeps = {
  findDelegate: (smartWallet: Address, signer: Address) => Promise<{ userId: string } | null>;
  loadContests: (userId: string, chainId: number, eventId?: string) => Promise<ContestRow[]>;
  loadCandidates: (sportId: string, eventId: string) => Promise<Candidate[] | null>;
};

export async function listSignedBotContests(
  input: {
    chainId: number;
    smartWallet: string;
    deadline: bigint;
    signature: Hex;
    eventId?: string;
    nowSeconds: number;
    /** Pre-verified signer from ERC-8128 headers. Skips signature verification when set. */
    erc8128Signer?: Address;
  },
  deps: ListBotContestsDeps,
): Promise<
  | { ok: true; contests: BotContestListItem[] }
  | { ok: false; status: 400 | 401 | 403; error: string }
> {
  if (!isAddress(input.smartWallet)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }

  const smartWallet = getAddress(input.smartWallet);
  let signer: Address;

  if (input.erc8128Signer) {
    // ERC-8128: signature already verified by route handler
    signer = input.erc8128Signer;
  } else {
    // Legacy EIP-712: verify signature from query params
    try {
      assertDeadline(input.deadline, input.nowSeconds);
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error: error instanceof Error ? error.message : "Invalid deadline",
      };
    }

    const message: BotReadMessage = {
      action: "contests",
      smartWallet,
      chainId: BigInt(input.chainId),
      deadline: input.deadline,
    };
    try {
      signer = await recoverBotReadSigner(message, input.signature);
    } catch {
      return { ok: false, status: 401, error: "Invalid action signature" };
    }
  }

  const delegate = await deps.findDelegate(smartWallet, signer);
  if (!delegate) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }

  const rows = await deps.loadContests(
    delegate.userId,
    input.chainId,
    ...(input.eventId ? [input.eventId] : []),
  );
  const candidatesByEvent = new Map<string, Candidate[]>();
  for (const row of rows) {
    const key = `${row.sportId}:${row.eventId}`;
    if (candidatesByEvent.has(key)) continue;
    const candidates = await deps.loadCandidates(row.sportId, row.eventId);
    candidatesByEvent.set(key, candidates ?? []);
  }

  return {
    ok: true,
    contests: rows.map((row) => ({
      contestId: row.id,
      name: row.name,
      eventId: row.eventId,
      sportId: row.sportId,
      chainId: row.chainId,
      status: row.status,
      address: row.address,
      userGroupId: row.userGroupId,
      userGroupName: row.userGroupName,
      primaryDeposit: row.primaryDeposit,
      endTime: row.endTime.toISOString(),
      candidates: candidatesByEvent.get(`${row.sportId}:${row.eventId}`) ?? [],
    })),
  };
}

export function botContestListDeps(): ListBotContestsDeps {
  return {
    findDelegate: async (smartWallet, signer) => {
      const row = await prisma.botDelegate.findFirst({
        where: {
          smartWallet: smartWallet.toLowerCase(),
          delegateAddress: signer.toLowerCase(),
          status: "active",
        },
        select: { userId: true },
      });
      return row;
    },
    loadContests: async (userId, chainId, eventId) => {
      const visibility = await contestVisibilityWhere(userId, { chainId });
      const rows = await prisma.contest.findMany({
        where: {
          ...(eventId ? { eventId } : {}),
          ...visibility,
        },
        select: {
          id: true,
          name: true,
          eventId: true,
          chainId: true,
          status: true,
          address: true,
          userGroupId: true,
          endTime: true,
          settings: true,
          userGroup: { select: { name: true } },
          event: { select: { sportId: true } },
        },
        orderBy: { endTime: "asc" },
      });
      return rows.map((row) => {
        const deposit = primaryDepositFromSettings(row.settings);
        return {
          id: row.id,
          name: row.name,
          eventId: row.eventId,
          sportId: row.event.sportId,
          chainId: row.chainId,
          status: row.status,
          address: row.address,
          userGroupId: row.userGroupId,
          userGroupName: row.userGroup?.name ?? null,
          primaryDeposit: typeof deposit === "number" ? deposit : null,
          endTime: row.endTime,
        };
      });
    },
    loadCandidates: getEventCandidates,
  };
}
