import { getAddress, isAddress, type Address } from "viem";
import type { Candidate } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { getEventCandidates } from "../events/getEventCandidates.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { contestVisibilityWhere, listedContestStatusWhere } from "../../utils/contestListQuery.js";
import { classifySigner, type StoredWalletOwner } from "./accountKey.js";

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
  findOwner: (smartWallet: Address, chainId: number) => Promise<StoredWalletOwner | null>;
  loadContests: (userId: string, chainId: number, eventId?: string) => Promise<ContestRow[]>;
  loadCandidates: (sportId: string, eventId: string) => Promise<Candidate[] | null>;
};

export async function listSignedBotContests(
  input: {
    chainId: number;
    smartWallet: string;
    signer: Address;
    eventId?: string;
  },
  deps: ListBotContestsDeps,
): Promise<
  | { ok: true; contests: BotContestListItem[] }
  | { ok: false; status: 400 | 403; error: string }
> {
  if (!isAddress(input.smartWallet) || !isAddress(input.signer)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }

  const smartWallet = getAddress(input.smartWallet);
  const signer = getAddress(input.signer);
  const owner = await deps.findOwner(smartWallet, input.chainId);
  const role = classifySigner(signer, smartWallet, input.chainId, owner?.ownerAddress);
  const actor =
    role === "owner" || role === "wallet" ? owner : await deps.findDelegate(smartWallet, signer);
  if (!actor) {
    return {
      ok: false,
      status: 403,
      error:
        role === "owner" || role === "wallet"
          ? "No account for this wallet"
          : "No active delegate for this signature",
    };
  }

  const rows = await deps.loadContests(
    actor.userId,
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
    findOwner: async (smartWallet, chainId) => {
      const row = await prisma.userWallet.findUnique({
        where: { chainId_publicKey: { chainId, publicKey: smartWallet.toLowerCase() } },
        select: { userId: true, ownerAddress: true },
      });
      return row;
    },
    loadContests: async (userId, chainId, eventId) => {
      const visibility = await contestVisibilityWhere(userId, { chainId });
      const rows = await prisma.contest.findMany({
        where: {
          ...(eventId ? { eventId } : {}),
          ...listedContestStatusWhere,
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
