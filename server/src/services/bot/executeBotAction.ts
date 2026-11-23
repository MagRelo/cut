import { getAddress, isAddress, type Address, type Hex } from "viem";
import { generateContestEntryId } from "../../utils/contestEntryId.js";
import { hasOnchainEscrow } from "../../utils/hasOnchainEscrow.js";
import {
  canAddPrimaryPosition,
  canRemovePrimaryPosition,
  type ContestStatus,
} from "../shared/types.js";
import { classifySigner, kernelOwnerWallet, type StoredWalletOwner } from "./accountKey.js";
import { unpackApproval } from "./approvalEnvelope.js";
import { sessionKeyRefusal } from "./sessionKeyEnabled.js";
import {
  assertJoinCalls,
  assertLeaveCalls,
  buildJoinCalls,
  buildLeaveCalls,
  type BotCall,
} from "./botCalls.js";
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
  signer: Address;
  userOpSignature?: Hex;
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
    }
  | { ok: false; status: number; error: string };

export type BotActionDeps = {
  findDelegate: (smartWallet: Address, signer: Address) => Promise<BotDelegateRow | null>;
  findOwner: (smartWallet: Address, chainId: number) => Promise<StoredWalletOwner | null>;
  rememberOwner?: (smartWallet: Address, chainId: number, signer: Address) => Promise<void>;
  sessionEnabled: (
    smartWallet: Address,
    permissionId: Hex,
    chainId: number,
  ) => Promise<boolean | "cannot-execute">;
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
  prepareOwnerUserOp: (input: {
    chainId: number;
    owner: Address;
    smartWallet: Address;
    calls: BotCall[];
  }) => Promise<
    { ok: true; userOpHash: Hex; userOp: SerializedUserOp } | { ok: false; error: string }
  >;
  submitOwnerUserOp: (input: {
    chainId: number;
    owner: Address;
    smartWallet: Address;
    calls: BotCall[];
    userOpSignature: Hex;
    userOp: SerializedUserOp;
  }) => Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }>;
  submitCalls: (input: {
    chainId: number;
    approval: string;
    calls: BotCall[];
    delegateAddress: Address;
    smartWallet: Address;
    userOpSignature: Hex;
    userOp: SerializedUserOp;
  }) => Promise<{ ok: true; txHash?: Hex } | { ok: false; error: string }>;
  log: (userId: string, action: string, error?: string) => Promise<void>;
};

async function requireEnabledSession(
  delegate: BotDelegateRow,
  chainId: number,
  deps: BotActionDeps,
): Promise<{ ok: true; approval: string } | { ok: false; status: number; error: string }> {
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
  const enabled = await deps.sessionEnabled(
    getAddress(delegate.smartWallet),
    permissionId,
    chainId,
  );
  const refusal = sessionKeyRefusal(enabled);
  if (refusal) {
    await deps.log(delegate.userId, "error", refusal);
    return { ok: false, status: 403, error: refusal };
  }
  return { ok: true, approval };
}

export async function executeBotAction(
  input: ExecuteBotActionInput,
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!isAddress(input.smartWallet) || !isAddress(input.signer)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const smartWallet = getAddress(input.smartWallet);
  const signer = getAddress(input.signer);

  let userId: string;
  let delegate: BotDelegateRow | null;
  let signerRole: "owner" | "wallet" | "other";
  const ownerRow = await deps.findOwner(smartWallet, input.chainId);
  signerRole = classifySigner(signer, smartWallet, input.chainId, ownerRow?.ownerAddress);
  if (signerRole === "owner" || signerRole === "wallet") {
    if (!ownerRow) return { ok: false, status: 403, error: "No account for this wallet" };
    if (
      signerRole === "owner" &&
      !ownerRow.ownerAddress &&
      kernelOwnerWallet(signer, input.chainId) === smartWallet
    ) {
      await deps.rememberOwner?.(smartWallet, input.chainId, signer);
    }
    userId = ownerRow.userId;
    delegate = null;
  } else {
    delegate = await deps.findDelegate(smartWallet, signer);
    if (!delegate) {
      return { ok: false, status: 403, error: "No active delegate for this signature" };
    }
    userId = delegate.userId;
  }

  let approval = "";
  if (delegate) {
    const enabled = await requireEnabledSession(delegate, input.chainId, deps);
    if (!enabled.ok) return enabled;
    approval = enabled.approval;
  }

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
    return leaveAction(input, userId, delegate, contest, approval, signerRole, deps);
  }
  return joinAction(input, userId, delegate, contest, approval, signerRole, deps);
}

async function joinAction(
  input: ExecuteBotActionInput,
  userId: string,
  delegate: BotDelegateRow | null,
  contest: BotContest,
  approval: string,
  signerRole: "owner" | "wallet" | "other",
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
    delegate,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    signerRole,
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
  delegate: BotDelegateRow | null,
  contest: BotContest,
  approval: string,
  signerRole: "owner" | "wallet" | "other",
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
    delegate,
    approval,
    calls,
    onchain,
    lineup.lineup.id,
    signerRole,
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
  delegate: BotDelegateRow | null,
  approval: string,
  calls: BotCall[],
  onchain: boolean,
  lineupId: string,
  signerRole: "owner" | "wallet" | "other",
  deps: BotActionDeps,
): Promise<ExecuteBotActionResult> {
  if (!onchain) return { ok: true, lineupId };
  if (!delegate) {
    const smartWallet = getAddress(input.smartWallet);
    const owner = getAddress(input.signer);
    if (signerRole !== "owner") {
      return {
        ok: false,
        status: 403,
        error: "On-chain actions from this wallet are signed by its owner key",
      };
    }
    if (!input.userOpSignature || !input.userOp) {
      const prepared = await deps.prepareOwnerUserOp({
        chainId: input.chainId,
        owner,
        smartWallet,
        calls,
      });
      if (!prepared.ok) {
        await deps.log(userId, "error", prepared.error);
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
    const submitted = await deps.submitOwnerUserOp({
      chainId: input.chainId,
      owner,
      smartWallet,
      calls,
      userOpSignature: input.userOpSignature,
      userOp: input.userOp,
    });
    if (!submitted.ok) {
      await deps.log(userId, "error", submitted.error);
      return { ok: false, status: 502, error: submitted.error };
    }
    return { ok: true, lineupId };
  }
  const smartWallet = getAddress(input.smartWallet);
  const delegateAddress = getAddress(delegate.delegateAddress);
  if (!input.userOpSignature || !input.userOp) {
    const prepared = await deps.prepareUserOp({
      chainId: input.chainId,
      approval,
      calls,
      delegateAddress,
      smartWallet,
    });
    if (!prepared.ok) {
      await deps.log(delegate.userId, "error", prepared.error);
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
  const submitted = await deps.submitCalls({
    chainId: input.chainId,
    approval,
    calls,
    delegateAddress,
    smartWallet,
    userOpSignature: input.userOpSignature,
    userOp: input.userOp,
  });
  if (!submitted.ok) {
    await deps.log(delegate.userId, "error", submitted.error);
    return { ok: false, status: 502, error: submitted.error };
  }
  return { ok: true, lineupId };
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
