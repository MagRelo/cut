import { isDelegatePublicKey } from "@playthecut/agent";
import { getAddress, isAddress, type Address, type Hex } from "viem";
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
  serializeBotCalls,
  type BotCall,
  type SerializedBotCall,
} from "./botCalls.js";
import { readQuorumApproval } from "./quorumApproval.js";
import { relayQuorumUserOp } from "./quorumUserOp.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";

export type BotActionName = "lineupUpsert" | "join" | "leave";

export type BotDelegateRow = {
  userId: string;
  smartWallet: string;
  delegateAddress: string;
  approval: string;
};

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

export type ExecuteBotActionInput = {
  chainId: number;
  action: BotActionName;
  smartWallet: string;
  contestId: string;
  lineupId: string;
  picks: string[];
  prediction?: unknown;
  signer: string;
  authorizationSignature?: string;
  userOp?: SerializedUserOp;
};

export type ExecuteBotActionResult =
  | { ok: true; lineupId: string; preparedUserOp?: undefined }
  | {
      ok: true;
      preparedUserOp: true;
      lineupId: string;
      userOpHash: Hex;
      userOp: SerializedUserOp;
      calls: SerializedBotCall[];
      authorization?: unknown;
    }
  | { ok: false; status: number; error: string };

export type BotActionDeps = {
  findDelegate: (smartWallet: Address, signer: string) => Promise<BotDelegateRow | null>;
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
  log: (userId: string, action: string, error?: string) => Promise<void>;
};

function requireEnabledSession(
  delegate: BotDelegateRow,
): { ok: true; approval: string } | { ok: false; status: number; error: string } {
  if (!readQuorumApproval(delegate.approval)) {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  return { ok: true, approval: delegate.approval };
}

export async function executeBotAction(
  input: ExecuteBotActionInput,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!isAddress(input.smartWallet)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const smartWallet = getAddress(input.smartWallet);

  if (!isDelegatePublicKey(input.signer)) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  const delegate = await deps.findDelegate(smartWallet, input.signer);
  if (!delegate) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  const userId = delegate.userId;
  const enabled = requireEnabledSession(delegate);
  if (!enabled.ok) return enabled;
  const approval = enabled.approval;

  const contest = await deps.loadContest(input.contestId);
  if (!contest || contest.chainId !== input.chainId) {
    return { ok: false, status: 404, error: "Contest not found" };
  }
  if (contest.userGroupId) {
    const member = await deps.isGroupMember(userId, contest.userGroupId);
    if (!member) {
      return { ok: false, status: 403, error: "You do not have access to this contest" };
    }
  }

  if (input.action === "lineupUpsert") {
    return upsertLineup(input, userId, contest, deps);
  }
  if (input.action === "leave") {
    return leaveAction(input, userId, contest, approval, deps);
  }
  return joinAction(input, userId, contest, approval, deps);
}

async function joinAction(
  input: ExecuteBotActionInput,
  userId: string,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canAddPrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open for entries" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Join does not change the lineup" };
  }
  const lineup = await requireLineup(input, userId, contest, deps);
  if (!lineup.ok) return { ok: false, status: 400, error: lineup.error };
  if (lineup.lineup.picks.length < 1) {
    return { ok: false, status: 400, error: "Lineup must have at least 1 player" };
  }

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
      await deps.log(userId, "error", message);
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(
    input,
    userId,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    deps,
  );
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.insertContestEntry({
    contestId: contest.id,
    lineupId: lineup.lineup.id,
    userId,
    entryId: onchain
      ? String(generateContestEntryId(contest.address as string, lineup.lineup.id))
      : null,
  });
  await deps.log(userId, "join");
  return { ok: true, lineupId: lineup.lineup.id };
}

async function leaveAction(
  input: ExecuteBotActionInput,
  userId: string,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canRemovePrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open to leave" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Leave does not change the lineup" };
  }
  const lineup = await requireLineup(input, userId, contest, deps);
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
      await deps.log(userId, "error", message);
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(
    input,
    userId,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    deps,
  );
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.deleteContestEntry(contest.id, lineup.lineup.id, userId);
  await deps.log(userId, "leave");
  return { ok: true, lineupId: lineup.lineup.id };
}

async function upsertLineup(
  input: ExecuteBotActionInput,
  userId: string,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (input.picks.length === 0) {
    return { ok: false, status: 400, error: "Lineup requires candidates" };
  }
  if (input.lineupId) {
    const existing = await requireLineup(input, userId, contest, deps);
    if (!existing.ok) return { ok: false, status: 400, error: existing.error };
    const result = await deps.updateLineup({
      userId,
      lineupId: input.lineupId,
      picks: input.picks,
      ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
    });
    if (!result.ok) {
      await deps.log(userId, "error", result.error);
      return { ok: false, status: 400, error: result.error };
    }
    await deps.log(userId, "lineupUpsert");
    return { ok: true, lineupId: input.lineupId };
  }

  const match = await deps.findLineupByPicks(userId, contest.id, input.picks);
  if (match) return { ok: true, lineupId: match.id };
  const created = await deps.createLineup({
    userId,
    contest,
    picks: input.picks,
    ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
  });
  if (!created.ok) {
    await deps.log(userId, "error", created.error);
    return { ok: false, status: 400, error: created.error };
  }
  await deps.log(userId, "lineupUpsert");
  return { ok: true, lineupId: created.lineup.id };
}

async function submitIfNeeded(
  input: ExecuteBotActionInput,
  userId: string,
  approval: string,
  calls: BotCall[],
  onchain: boolean,
  lineupId: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!onchain) return { ok: true, lineupId };
  const smartWallet = getAddress(input.smartWallet);
  const relayed = await relayQuorumUserOp({
    approval,
    chainId: input.chainId,
    smartWallet,
    calls,
    ...(input.userOp ? { userOp: input.userOp } : {}),
    ...(input.authorizationSignature ? { authorizationSignature: input.authorizationSignature } : {}),
    signer: input.signer,
  });
  if (relayed.kind === "prepared") {
    return {
      ok: true,
      preparedUserOp: true,
      lineupId,
      userOpHash: relayed.userOpHash,
      userOp: relayed.userOp,
      calls: serializeBotCalls(calls),
      authorization: relayed.authorization,
    };
  }
  if (relayed.kind === "submitted") return { ok: true, lineupId };
  if (relayed.kind === "skip") {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  await deps.log(userId, "error", relayed.error);
  return { ok: false, status: relayed.status, error: relayed.error };
}

async function requireLineup(
  input: ExecuteBotActionInput,
  userId: string,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<{ ok: true; lineup: BotLineup } | { ok: false; error: string }> {
  if (!input.lineupId) return { ok: false, error: "Lineup is required" };
  const lineup = await deps.findLineup(input.lineupId);
  if (!lineup || lineup.userId !== userId || lineup.eventId !== contest.eventId) {
    return { ok: false, error: "Lineup not found" };
  }
  if (lineup.contestId && lineup.contestId !== contest.id) {
    return { ok: false, error: "Lineup is for a different contest" };
  }
  return { ok: true, lineup };
}
