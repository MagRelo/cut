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
  hashPicks,
  type BotCall,
} from "./botCalls.js";
import {
  assertDeadline,
  recoverBotActionSigner,
  type BotActionMessage,
  type BotActionName,
} from "./botActionSignature.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";

/**
 * ERC-8128 pre-verified authentication context.
 * When present, signature verification has already been done by the route handler
 * and this contains the verified signer and nonce for replay protection.
 */
export type Erc8128Auth = {
  signer: Address;
  chainId: number;
  nonce: string;
};

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
  prediction?: unknown;
  deadline: bigint;
  signature: Hex;
  userOpSignature?: Hex;
  userOp?: SerializedUserOp;
  nowSeconds: number;
  /** ERC-8128 pre-verified auth context. When set, signature is already verified. */
  erc8128Auth?: Erc8128Auth;
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
  prepareUserOp: (input: {
    chainId: number;
    approval: string;
    calls: BotCall[];
    delegateAddress: Address;
    smartWallet: Address;
  }) => Promise<
    { ok: true; userOpHash: Hex; userOp: SerializedUserOp } | { ok: false; error: string }
  >;
  submitCalls: (input: {
    chainId: number;
    approval: string;
    calls: BotCall[];
    delegateAddress: Address;
    smartWallet: Address;
    privateKey?: Hex;
    userOpSignature?: Hex;
    userOp?: SerializedUserOp;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  log: (userId: string, action: string, error?: string, nonce?: { signerAddress: string; nonce: string }) => Promise<void>;
  /**
   * Reserve a nonce for ERC-8128 replay protection.
   * Must be called BEFORE executing any write action.
   * Returns false if the nonce was already used (replay attempt).
   */
  reserveNonce: (signerAddress: Address, nonce: string, userId: string, action: string) => Promise<boolean>;
};

function messageFor(input: ExecuteBotActionInput, smartWallet: Address): BotActionMessage {
  const chainAction = input.action === "join" || input.action === "leave";
  return {
    action: input.action,
    smartWallet,
    contestId: input.contestId,
    lineupId: input.lineupId,
    picksHash: chainAction ? hashPicks([]) : hashPicks(input.picks),
    callsHash: zeroHash,
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

  let signer: Address;

  if (input.erc8128Auth) {
    // ERC-8128: signature already verified by route handler, use pre-verified signer
    signer = input.erc8128Auth.signer;

    // Reserve nonce BEFORE executing any write action (replay protection)
    const nonceReserved = await deps.reserveNonce(
      signer,
      input.erc8128Auth.nonce,
      "", // userId not known yet, will be filled by reserveNonce from delegate lookup
      input.action,
    );
    if (!nonceReserved) {
      return { ok: false, status: 409, error: "Nonce already used (replay rejected)" };
    }
  } else {
    // Legacy EIP-712: verify signature from body
    try {
      assertDeadline(input.deadline, input.nowSeconds);
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error: error instanceof Error ? error.message : "Invalid deadline",
      };
    }

    try {
      signer = await recoverBotActionSigner(input.chainId, messageFor(input, smartWallet), input.signature);
    } catch {
      return { ok: false, status: 401, error: "Invalid action signature" };
    }
  }

  const delegate = await deps.findDelegate(smartWallet, signer);
  if (!delegate) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }

  // For ERC-8128, we need to re-reserve nonce with the correct userId now that we have the delegate
  // The initial reserveNonce above was a pre-check; the actual insert happens in the log call
  const nonceInfo = input.erc8128Auth
    ? { signerAddress: getAddress(signer), nonce: input.erc8128Auth.nonce }
    : undefined;

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
    await deps.log(delegate.userId, "error", "Session key is not enabled", nonceInfo);
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

  if (input.action === "lineupUpsert") {
    return upsertLineup(input, delegate, contest, deps, nonceInfo);
  }
  if (input.action === "leave") {
    return leaveAction(input, delegate, contest, approval, deps, nonceInfo);
  }
  return joinAction(input, delegate, contest, approval, deps, nonceInfo);
}

async function joinAction(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
  nonceInfo?: { signerAddress: string; nonce: string },
): Promise<ExecuteBotActionResult> {
  if (!canAddPrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open for entries" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Join does not change the lineup" };
  }
  const lineup = await requireLineup(input, delegate, contest, deps);
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
      await deps.log(delegate.userId, "error", message, nonceInfo);
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(
    input,
    delegate,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    deps,
    nonceInfo,
  );
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.insertContestEntry({
    contestId: contest.id,
    lineupId: lineup.lineup.id,
    userId: delegate.userId,
    entryId: onchain
      ? String(generateContestEntryId(contest.address as string, lineup.lineup.id))
      : null,
  });
  await deps.log(delegate.userId, "join", undefined, nonceInfo);
  return { ok: true, lineupId: lineup.lineup.id };
}

async function leaveAction(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  approval: string,
  deps: BotActionDeps,
  nonceInfo?: { signerAddress: string; nonce: string },
): Promise<ExecuteBotActionResult> {
  if (!canRemovePrimaryPosition(contest.status)) {
    return { ok: false, status: 409, error: "Contest is not open to leave" };
  }
  if (input.picks.length > 0) {
    return { ok: false, status: 400, error: "Leave does not change the lineup" };
  }
  const lineup = await requireLineup(input, delegate, contest, deps);
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
      await deps.log(delegate.userId, "error", message, nonceInfo);
      return { ok: false, status: 400, error: message };
    }
  }

  const submitted = await submitIfNeeded(
    input,
    delegate,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    deps,
    nonceInfo,
  );
  if (!submitted.ok || submitted.preparedUserOp) return submitted;

  await deps.deleteContestEntry(contest.id, lineup.lineup.id, delegate.userId);
  await deps.log(delegate.userId, "leave", undefined, nonceInfo);
  return { ok: true, lineupId: lineup.lineup.id };
}

async function upsertLineup(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  deps: BotActionDeps,
  nonceInfo?: { signerAddress: string; nonce: string },
): Promise<ExecuteBotActionResult> {
  if (input.picks.length === 0) {
    return { ok: false, status: 400, error: "Lineup requires picks" };
  }
  if (input.lineupId) {
    const existing = await requireLineup(input, delegate, contest, deps);
    if (!existing.ok) return { ok: false, status: 400, error: existing.error };
    const result = await deps.updateLineup({
      userId: delegate.userId,
      lineupId: input.lineupId,
      picks: input.picks,
      ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
    });
    if (!result.ok) {
      await deps.log(delegate.userId, "error", result.error, nonceInfo);
      return { ok: false, status: 400, error: result.error };
    }
    await deps.log(delegate.userId, "lineupUpsert", undefined, nonceInfo);
    return { ok: true, lineupId: input.lineupId };
  }

  const match = await deps.findLineupByPicks(delegate.userId, contest.id, input.picks);
  if (match) return { ok: true, lineupId: match.id };
  const created = await deps.createLineup({
    userId: delegate.userId,
    contest,
    picks: input.picks,
    ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
  });
  if (!created.ok) {
    await deps.log(delegate.userId, "error", created.error, nonceInfo);
    return { ok: false, status: 400, error: created.error };
  }
  await deps.log(delegate.userId, "lineupUpsert", undefined, nonceInfo);
  return { ok: true, lineupId: created.lineup.id };
}

async function submitIfNeeded(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  approval: string,
  calls: BotCall[],
  onchain: boolean,
  lineupId: string,
  deps: BotActionDeps,
  nonceInfo?: { signerAddress: string; nonce: string },
): Promise<ExecuteBotActionResult> {
  if (!onchain) return { ok: true, lineupId };
  const smartWallet = getAddress(input.smartWallet);
  const delegateAddress = getAddress(delegate.delegateAddress);
  if (delegate.kind === "external" && !input.userOpSignature) {
    const prepared = await deps.prepareUserOp({
      chainId: input.chainId,
      approval,
      calls,
      delegateAddress,
      smartWallet,
    });
    if (!prepared.ok) {
      await deps.log(delegate.userId, "error", prepared.error, nonceInfo);
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
  if (delegate.kind === "cut_bot" && !getCutBotPrivateKey()) {
    return { ok: false, status: 503, error: "Cut Bot key is not configured" };
  }
  const privateKey = delegate.kind === "cut_bot" ? getCutBotPrivateKey() : null;
  const submitted = await deps.submitCalls({
    chainId: input.chainId,
    approval,
    calls,
    delegateAddress,
    smartWallet,
    ...(privateKey ? { privateKey } : {}),
    ...(input.userOpSignature ? { userOpSignature: input.userOpSignature } : {}),
    ...(input.userOp ? { userOp: input.userOp } : {}),
  });
  if (!submitted.ok) {
    await deps.log(delegate.userId, "error", submitted.error, nonceInfo);
    return { ok: false, status: 502, error: submitted.error };
  }
  return { ok: true, lineupId };
}

async function requireLineup(
  input: ExecuteBotActionInput,
  delegate: BotDelegateRow,
  contest: BotContest,
  deps: BotActionDeps,
): Promise<{ ok: true; lineup: BotLineup } | { ok: false; error: string }> {
  if (!input.lineupId) return { ok: false, error: "Lineup is required" };
  const lineup = await deps.findLineup(input.lineupId);
  if (!lineup || lineup.userId !== delegate.userId || lineup.eventId !== contest.eventId) {
    return { ok: false, error: "Lineup not found" };
  }
  if (lineup.contestId && lineup.contestId !== contest.id) {
    return { ok: false, error: "Lineup is for a different contest" };
  }
  return { ok: true, lineup };
}
