import { getAddress, type Address, type Hex } from "viem";
import { getCutBotPrivateKey } from "../../lib/cutBotKey.js";
import { generateContestEntryId } from "../../utils/contestEntryId.js";
import { hasOnchainEscrow } from "../../utils/hasOnchainEscrow.js";
import {
  canAddPrimaryPosition,
  canRemovePrimaryPosition,
  type ContestStatus,
} from "../shared/types.js";
import {
  assertJoinCalls,
  assertLeaveCalls,
  buildJoinCalls,
  buildLeaveCalls,
  type BotCall,
} from "./botCalls.js";
import type { BotActor } from "./botActor.js";
import type { SerializedUserOp, UserOpAuthority } from "./submitSessionKeyUserOp.js";
import { callsWithinGrant, grantFromApproval } from "./delegatePolicy.js";

export type ContestActionName = "lineupUpsert" | "join" | "leave";

export type BotContest = {
  id: string;
  eventId: string;
  userGroupId: string | null;
  address: string | null;
  chainId: number;
  status: ContestStatus;
  paymentToken: Address | null;
  depositWei: bigint;
};

export type BotLineup = {
  id: string;
  userId: string;
  eventId: string;
  contestId: string | null;
  picks: string[];
};

/**
 * One contest action. The request was already authenticated (ERC-8128), its nonce
 * reserved, and the signer resolved to an actor (wallet owner or active delegate).
 */
export type ExecuteBotActionInput = {
  chainId: number;
  action: ContestActionName;
  actor: BotActor;
  contestId: string;
  lineupId: string;
  picks: string[];
  prediction?: unknown;
  userOpSignature?: Hex | undefined;
  userOp?: SerializedUserOp | undefined;
};

export type ExecuteBotActionResult =
  | { ok: true; lineupId: string; preparedUserOp?: undefined }
  | {
      ok: true;
      preparedUserOp: true;
      lineupId: string;
      userOpHash: Hex;
      userOp: SerializedUserOp;
    }
  | { ok: false; status: number; error: string };

export type PrepareUserOpInput = {
  chainId: number;
  authority: UserOpAuthority;
  calls: BotCall[];
  smartWallet: Address;
};

export type BotActionDeps = {
  loadContest: (contestId: string) => Promise<BotContest | null>;
  isGroupMember: (userId: string, userGroupId: string) => Promise<boolean>;
  findLineup: (lineupId: string) => Promise<BotLineup | null>;
  findLineupByPicks: (
    userId: string,
    contestId: string,
    picks: string[],
  ) => Promise<BotLineup | null>;
  createLineup: (input: {
    userId: string;
    contest: BotContest;
    picks: string[];
    prediction?: unknown;
  }) => Promise<{ ok: true; lineup: BotLineup } | { ok: false; error: string }>;
  findContestEntry: (contestId: string, lineupId: string) => Promise<{ id: string } | null>;
  insertContestEntry: (input: {
    contestId: string;
    lineupId: string;
    userId: string;
    entryId: string | null;
  }) => Promise<void>;
  deleteContestEntry: (contestId: string, lineupId: string, userId: string) => Promise<boolean>;
  updateLineup: (input: {
    userId: string;
    lineupId: string;
    picks: string[];
    prediction?: unknown;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  prepareUserOp: (
    input: PrepareUserOpInput,
  ) => Promise<
    { ok: true; userOpHash: Hex; userOp: SerializedUserOp } | { ok: false; error: string }
  >;
  submitCalls: (
    input: PrepareUserOpInput & {
      privateKey?: Hex | undefined;
      userOpSignature?: Hex | undefined;
      userOp?: SerializedUserOp | undefined;
    },
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export async function executeBotAction(
  input: ExecuteBotActionInput,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  const contest = await deps.loadContest(input.contestId);
  if (!contest || contest.chainId !== input.chainId) {
    return { ok: false, status: 404, error: "Contest not found" };
  }
  if (contest.userGroupId) {
    const member = await deps.isGroupMember(input.actor.userId, contest.userGroupId);
    if (!member) {
      return { ok: false, status: 403, error: "You do not have access to this contest" };
    }
  }

  if (input.action === "lineupUpsert") {
    return upsertLineup(input, contest, deps);
  }
  if (input.action === "leave") {
    return leaveAction(input, contest, deps);
  }
  return joinAction(input, contest, deps);
}

async function joinAction(
  input: ExecuteBotActionInput,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canAddPrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open for entries" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Join does not change the lineup" };
  }
  const lineup = await requireLineup(input, contest, deps);
  if (!lineup.ok) return { ok: false, status: 400, error: lineup.error };

  const existing = await deps.findContestEntry(contest.id, lineup.lineup.id);
  if (existing) return { ok: true, lineupId: lineup.lineup.id };

  const onchain = hasOnchainEscrow(contest);
  if (onchain && (!contest.paymentToken || contest.depositWei <= 0n)) {
    return { ok: false, status: 400, error: "Contest deposit is not available" };
  }
  const calls = onchain
    ? buildJoinCalls({
        paymentToken: contest.paymentToken as Address,
        contest: getAddress(contest.address as string),
        depositWei: contest.depositWei,
        entryId: BigInt(generateContestEntryId(contest.address as string, lineup.lineup.id)),
      })
    : [];
  if (onchain) {
    try {
      assertJoinCalls(calls, {
        paymentToken: contest.paymentToken as Address,
        contest: getAddress(contest.address as string),
        depositWei: contest.depositWei,
        entryId: BigInt(generateContestEntryId(contest.address as string, lineup.lineup.id)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Join calls rejected";
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(input, calls, onchain, lineup.lineup.id, deps);
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.insertContestEntry({
    contestId: contest.id,
    lineupId: lineup.lineup.id,
    userId: input.actor.userId,
    entryId: onchain
      ? String(generateContestEntryId(contest.address as string, lineup.lineup.id))
      : null,
  });
  return { ok: true, lineupId: lineup.lineup.id };
}

async function leaveAction(
  input: ExecuteBotActionInput,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canRemovePrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open to leave" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Leave does not change the lineup" };
  }
  const lineup = await requireLineup(input, contest, deps);
  if (!lineup.ok) return { ok: false, status: 400, error: lineup.error };
  const entry = await deps.findContestEntry(contest.id, lineup.lineup.id);
  if (!entry) return { ok: true, lineupId: lineup.lineup.id };

  const onchain = hasOnchainEscrow(contest);
  const calls = onchain
    ? buildLeaveCalls({
        contest: getAddress(contest.address as string),
        entryId: BigInt(generateContestEntryId(contest.address as string, lineup.lineup.id)),
      })
    : [];
  if (onchain) {
    try {
      assertLeaveCalls(calls, {
        contest: getAddress(contest.address as string),
        entryId: BigInt(generateContestEntryId(contest.address as string, lineup.lineup.id)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Leave calls rejected";
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(input, calls, onchain, lineup.lineup.id, deps);
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.deleteContestEntry(contest.id, lineup.lineup.id, input.actor.userId);
  return { ok: true, lineupId: lineup.lineup.id };
}

async function upsertLineup(
  input: ExecuteBotActionInput,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (input.picks.length === 0) {
    return { ok: false, status: 400, error: "Lineup requires picks" };
  }
  if (input.lineupId) {
    const existing = await requireLineup(input, contest, deps);
    if (!existing.ok) return { ok: false, status: 400, error: existing.error };
    const result = await deps.updateLineup({
      userId: input.actor.userId,
      lineupId: input.lineupId,
      picks: input.picks,
      ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
    });
    if (!result.ok) {
      return { ok: false, status: 400, error: result.error };
    }
    return { ok: true, lineupId: input.lineupId };
  }

  const match = await deps.findLineupByPicks(input.actor.userId, contest.id, input.picks);
  if (match) return { ok: true, lineupId: match.id };
  const created = await deps.createLineup({
    userId: input.actor.userId,
    contest,
    picks: input.picks,
    ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
  });
  if (!created.ok) {
    return { ok: false, status: 400, error: created.error };
  }
  return { ok: true, lineupId: created.lineup.id };
}

function authorityFor(actor: BotActor): UserOpAuthority {
  if (actor.role === "owner") {
    return { kind: "owner", ownerAddress: actor.signer };
  }
  return {
    kind: "session",
    approval: actor.approval,
    delegateAddress: getAddress(actor.delegate.delegateAddress),
  };
}

/**
 * Cut Bot's key lives on the server, so the server signs and submits in one request.
 * Everyone else (the wallet owner or an external delegate) signs the user operation
 * themselves: the first request returns `preparedUserOp`, the second sends the signature.
 */
async function submitIfNeeded(
  input: ExecuteBotActionInput,
  calls: BotCall[],
  onchain: boolean,
  lineupId: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!onchain) return { ok: true, lineupId };
  if (input.actor.role === "delegate") {
    // The call policy would reject these on-chain; say why before building a user operation.
    let covered = false;
    try {
      covered = callsWithinGrant(grantFromApproval(input.actor.approval), calls);
    } catch {
      covered = false;
    }
    if (!covered) {
      return {
        ok: false,
        status: 403,
        error:
          "This delegate's grant does not cover this contest. The wallet owner must add the delegate again with this contest (delegateAdd).",
      };
    }
  }
  const smartWallet = input.actor.smartWallet;
  const authority = authorityFor(input.actor);
  const serverSigned = input.actor.role === "delegate" && input.actor.delegate.kind === "cut_bot";
  if (!serverSigned && !input.userOpSignature) {
    const prepared = await deps.prepareUserOp({
      chainId: input.chainId,
      authority,
      calls,
      smartWallet,
    });
    if (!prepared.ok) {
      return { ok: false, status: 502, error: prepared.error };
    }
    return {
      ok: true,
      preparedUserOp: true,
      lineupId,
      userOpHash: prepared.userOpHash,
      userOp: prepared.userOp,
    };
  }
  if (!serverSigned && !input.userOp) {
    return { ok: false, status: 400, error: "userOp is required with userOpSignature" };
  }
  const privateKey = serverSigned ? getCutBotPrivateKey() : null;
  if (serverSigned && !privateKey) {
    return { ok: false, status: 503, error: "Cut Bot key is not configured" };
  }
  const submitted = await deps.submitCalls({
    chainId: input.chainId,
    authority,
    calls,
    smartWallet,
    ...(privateKey ? { privateKey } : {}),
    ...(!serverSigned && input.userOpSignature ? { userOpSignature: input.userOpSignature } : {}),
    ...(!serverSigned && input.userOp ? { userOp: input.userOp } : {}),
  });
  if (!submitted.ok) {
    return { ok: false, status: 502, error: submitted.error };
  }
  return { ok: true, lineupId };
}

async function requireLineup(
  input: ExecuteBotActionInput,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<{ ok: true; lineup: BotLineup } | { ok: false; error: string }> {
  if (!input.lineupId) return { ok: false, error: "Lineup is required" };
  const lineup = await deps.findLineup(input.lineupId);
  if (!lineup || lineup.userId !== input.actor.userId || lineup.eventId !== contest.eventId) {
    return { ok: false, error: "Lineup not found" };
  }
  if (lineup.contestId && lineup.contestId !== contest.id) {
    return { ok: false, error: "Lineup is for a different contest" };
  }
  return { ok: true, lineup };
}
