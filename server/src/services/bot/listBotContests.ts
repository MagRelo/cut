import type { Candidate } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { getEventCandidates } from "../events/getEventCandidates.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { contestVisibilityWhere } from "../../utils/contestListQuery.js";

/**
 * Contests the signed-in actor's user can see. The request was authenticated with an
 * ERC-8128 signature (no nonce: reads are replayable within their validity window) and
 * the signer resolved to the wallet owner or an active delegate before this runs.
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
  loadContests: (userId: string, chainId: number, eventId?: string) => Promise<ContestRow[]>;
  loadCandidates: (sportId: string, eventId: string) => Promise<Candidate[] | null>;
};

export async function listBotContests(
  input: { userId: string; chainId: number; eventId?: string | undefined },
  deps: ListBotContestsDeps,
): Promise<{ ok: true; contests: BotContestListItem[] }> {
  const rows = await deps.loadContests(
    input.userId,
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
