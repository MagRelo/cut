import { getAddress, isAddress, zeroHash, type Address, type Hex } from "viem";
import { getCutBotPrivateKey } from "../../lib/cutBotKey.js";
import { generateContestEntryId } from "../../utils/contestEntryId.js";
import { hasOnchainEscrow } from "../../utils/hasOnchainEscrow.js";
import {
  canAddPrimaryPosition,
  canRemovePrimaryPosition,
  type ContestStatus,
} from "../shared/types.js";
import { unpackApproval } from "./approvalEnvelope.js";
import {
  assertJoinCalls,
  assertLeaveCalls,
  buildJoinCalls,
  buildLeaveCalls,
  hashCalls,
  hashPicks,
  type BotCall,
} from "./botCalls.js";
import {
  assertDeadline,
  recoverBotActionSigner,
  type BotActionMessage,
  type BotActionName,
} from "./botActionSignature.js";

export const PREPARE_CALLS_HASH = hashCalls([]);

export type BotDelegateRow = {
  userId: string;
  smartWallet: string;
  delegateAddress: string;
  kind: "cut_bot" | "external";
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
  callsHash: Hex;
  prediction?: unknown;
  deadline: bigint;
  signature: Hex;
  userOpSignature?: Hex;
  nowSeconds: number;
};

export type ExecuteBotActionResult =
  | { ok: true; lineupId: string; prepared?: undefined }
  | { ok: true; prepared: true; lineupId: string; callsHash: Hex; calls: BotCall[] }
  | { ok: false; status: number; error: string };

export type BotActionDeps = {
  findDelegate: (smartWallet: Address, signer: Address) => Promise<BotDelegateRow | null>;
  sessionEnabled: (smartWallet: Address, permissionId: Hex, chainId: number) => Promise<boolean>;
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
  submitCalls: (input: {
    chainId: number;
    approval: string;
    calls: BotCall[];
    delegateAddress: Address;
    privateKey?: Hex;
    userOpSignature?: Hex;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  log: (userId: string, action: string, error?: string) => Promise<void>;
};

function picksMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((pick, index) => pick === right[index]);
}

function messageFor(input: ExecuteBotActionInput, smartWallet: Address): BotActionMessage {
  return {
    action: input.action,
    smartWallet,
    contestId: input.contestId,
    lineupId: input.lineupId,
    picksHash: hashPicks(input.picks),
    callsHash: input.action === "update" ? zeroHash : input.callsHash,
    deadline: input.deadline,
  };
}

export async function executeBotAction(
  input: ExecuteBotActionInput,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!isAddress(input.smartWallet)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const smartWallet = getAddress(input.smartWallet);

  try {
    assertDeadline(input.deadline, input.nowSeconds);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid deadline",
    };
  }

  let signer: Address;
  try {
    signer = await recoverBotActionSigner(input.chainId, messageFor(input, smartWallet), input.signature);
  } catch {
    return { ok: false, status: 401, error: "Invalid action signature" };
  }

  const delegate = await deps.findDelegate(smartWallet, signer);
  if (!delegate) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }

  let permissionId: Hex;
  let approval: string;
  try {
    const envelope = unpackApproval(delegate.approval);
    permissionId = envelope.permissionId;
    approval = envelope.approval;
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid delegate approval",
    };
  }

  const enabled = await deps.sessionEnabled(smartWallet, permissionId, input.chainId);
  if (!enabled) {
    await deps.log(delegate.userId, "error", "Session key is not enabled");
    return { ok: false, status: 403, error: "Session key is not enabled" };
  }

  const contest = await deps.loadContest(input.contestId);
  if (!contest || contest.chainId !== input.chainId) {
    return { ok: false, status: 404, error: "Contest not found" };
  }
  if (contest.userGroupId) {
    const member = await deps.isGroupMember(delegate.userId, contest.userGroupId);
    if (!member) {
      return { ok: false, status: 403, error: "You do not have access to this contest" };
    }
  }

  if (input.action === "update") {
    if (input.callsHash !== zeroHash) {
      return { ok: false, status: 400, error: "Update does not include chain calls" };
    }
    if (!input.lineupId) {
      return { ok: false, status: 400, error: "Update requires a lineup" };
    }
    const result = await deps.updateLineup({
      userId: delegate.userId,
      lineupId: input.lineupId,
      picks: input.picks,
      prediction: input.prediction,
    });
    if (!result.ok) {
      await deps.log(delegate.userId, "error", result.error);
      return { ok: false, status: 400, error: result.error };
    }
    await deps.log(delegate.userId, "update");
    return { ok: true, lineupId: input.lineupId };
  }

  if (input.action === "leave") {
    return leaveAction(input, delegate, contest, approval, deps);
  }
  return joinAction(input, delegate, contest, approval, deps);
}

async function joinAction(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canAddPrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open for entries" };
  }

  const lineup = await resolveJoinLineup(input, delegate, contest, deps);
  if (!lineup.ok) return { ok: false, status: 400, error: lineup.error };
  if (input.lineupId && input.picks.length > 0 && !picksMatch(lineup.lineup.picks, input.picks)) {
    return { ok: false, status: 400, error: "Picks do not match this lineup" };
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
      await deps.log(delegate.userId, "error", message);
      return { ok: false, status: 400, error: message };
    }
  }

  const callsHash = hashCalls(calls);
  if (input.callsHash === PREPARE_CALLS_HASH) {
    return { ok: true, prepared: true, lineupId: lineup.lineup.id, callsHash, calls };
  }
  if (input.callsHash !== callsHash) {
    return { ok: false, status: 400, error: "Calls do not match this contest" };
  }

  const submitted = await submitIfNeeded(input, delegate, approval, calls, onchain, deps);
  if (!submitted.ok) return submitted;

  await deps.insertContestEntry({
    contestId: contest.id,
    lineupId: lineup.lineup.id,
    userId: delegate.userId,
    entryId: onchain
      ? String(generateContestEntryId(contest.address as string, lineup.lineup.id))
      : null,
  });
  await deps.log(delegate.userId, "join");
  return { ok: true, lineupId: lineup.lineup.id };
}

async function leaveAction(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!canRemovePrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open to leave" };
  }
  if (!input.lineupId) {
    return { ok: false, status: 400, error: "Leave requires a lineup" };
  }
  const entry = await deps.findContestEntry(contest.id, input.lineupId);
  if (!entry) return { ok: true, lineupId: input.lineupId };

  const onchain = hasOnchainEscrow(contest);
  const calls = onchain
    ? buildLeaveCalls({
        contest: getAddress(contest.address as string),
        entryId: BigInt(generateContestEntryId(contest.address as string, input.lineupId)),
      })
    : [];
  if (onchain) {
    try {
      assertLeaveCalls(calls, {
        contest: getAddress(contest.address as string),
        entryId: BigInt(generateContestEntryId(contest.address as string, input.lineupId)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Leave calls rejected";
      await deps.log(delegate.userId, "error", message);
      return { ok: false, status: 400, error: message };
    }
  }

  const callsHash = hashCalls(calls);
  if (input.callsHash === PREPARE_CALLS_HASH) {
    return { ok: true, prepared: true, lineupId: input.lineupId, callsHash, calls };
  }
  if (input.callsHash !== callsHash) {
    return { ok: false, status: 400, error: "Calls do not match this contest" };
  }

  const submitted = await submitIfNeeded(input, delegate, approval, calls, onchain, deps);
  if (!submitted.ok) return submitted;

  await deps.deleteContestEntry(contest.id, input.lineupId, delegate.userId);
  await deps.log(delegate.userId, "leave");
  return { ok: true, lineupId: input.lineupId };
}

async function submitIfNeeded(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  approval: string,
  calls: BotCall[],
  onchain: boolean,
  deps: BotActionDeps,
): Promise<{ ok: true } | ExecuteBotActionResult> {
  if (!onchain) return { ok: true };
  if (delegate.kind === "external" && !input.userOpSignature) {
    return { ok: false, status: 400, error: "Personal delegate must sign the user operation" };
  }
  if (delegate.kind === "cut_bot" && !getCutBotPrivateKey()) {
    return { ok: false, status: 503, error: "Cut Bot key is not configured" };
  }
  const privateKey = delegate.kind === "cut_bot" ? getCutBotPrivateKey() : null;
  const submitted = await deps.submitCalls({
    chainId: input.chainId,
    approval,
    calls,
    delegateAddress: getAddress(delegate.delegateAddress),
    ...(privateKey ? { privateKey } : {}),
    ...(input.userOpSignature ? { userOpSignature: input.userOpSignature } : {}),
  });
  if (!submitted.ok) {
    await deps.log(delegate.userId, "error", submitted.error);
    return { ok: false, status: 502, error: submitted.error };
  }
  return { ok: true };
}

async function resolveJoinLineup(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<{ ok: true; lineup: BotLineup } | { ok: false; error: string }> {
  if (input.lineupId) {
    const lineup = await deps.findLineup(input.lineupId);
    if (!lineup || lineup.userId !== delegate.userId || lineup.eventId !== contest.eventId) {
      return { ok: false, error: "Lineup not found" };
    }
    return { ok: true, lineup };
  }
  const existing = await deps.findLineupByPicks(delegate.userId, contest.id, input.picks);
  if (existing) return { ok: true, lineup: existing };
  return deps.createLineup({
    userId: delegate.userId,
    contest,
    picks: input.picks,
    prediction: input.prediction,
  });
}
