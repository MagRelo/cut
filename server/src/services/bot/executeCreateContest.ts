import { isDelegatePublicKey } from "@playthecut/agent";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { getContestFactoryAddress, primaryDepositWeiFromSettings } from "../../lib/contractAddresses.js";
import { prisma } from "../../lib/prisma.js";
import { isStaffUserType } from "../../middleware/admin.js";
import { isUserGroupAdmin } from "../../utils/userGroup.js";
import { recordPaidContest, FACTORY_CONTEST_VERIFY_MESSAGES } from "../contest/recordPaidContest.js";
import { readFactoryCreatedContestAddress } from "../contest/verifyFactoryContestCreation.js";
import { readQuorumApproval } from "./quorumApproval.js";
import { relayQuorumUserOp } from "./quorumUserOp.js";
import {
  assertCreateContestCall,
  buildCreateContestCall,
  serializeBotCalls,
  type BotCall,
  type SerializedBotCall,
} from "./botCalls.js";
import { createBotActionDeps } from "./botActionRuntime.js";
import type { BotActionDeps } from "./executeBotAction.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";

export type CreateContestActionInput = {
  chainId: number;
  smartWallet: string;
  signer: string;
  name: string;
  description?: string;
  eventId: string;
  userGroupId?: string;
  endTime: Date;
  settings: Record<string, unknown>;
  notifyLeagueMembers?: boolean;
  authorizationSignature?: string;
  userOp?: SerializedUserOp;
};

export type CreateContestActionResult =
  | {
      ok: true;
      contestId: string;
      address: string;
      preparedUserOp?: undefined;
    }
  | {
      ok: true;
      preparedUserOp: true;
      userOpHash: Hex;
      userOp: SerializedUserOp;
      calls: SerializedBotCall[];
      authorization?: unknown;
    }
  | { ok: false; status: number; error: string };

export type CreateContestDeps = Pick<BotActionDeps, "findDelegate" | "log"> & {
  loadUserType: (userId: string) => Promise<string | null>;
  isLeagueAdmin: (userId: string, userGroupId: string) => Promise<boolean>;
  eventExists: (eventId: string) => Promise<boolean>;
  factoryAddress: (chainId: number) => Address | null;
  readCreatedAddress: (input: {
    chainId: number;
    transactionHash: Hex;
  }) => Promise<{ ok: true; contestAddress: Address } | { ok: false; error: string }>;
  recordContest: (
    input: CreateContestActionInput & { address: string; transactionHash: Hex },
  ) => Promise<
    { ok: true; contestId: string; address: string } | { ok: false; status: number; error: string }
  >;
};

/** On-chain expiry is unix seconds. A positive `settings.expiryTimestamp` wins; otherwise use `endTime`. */
function withDefaultExpiry(input: CreateContestActionInput): CreateContestActionInput {
  const current = input.settings.expiryTimestamp;
  if (typeof current === "number" && Number.isFinite(current) && current > 0) return input;
  const seconds = Math.floor(input.endTime.getTime() / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return input;
  return { ...input, settings: { ...input.settings, expiryTimestamp: seconds } };
}

function depositArgs(settings: Record<string, unknown>, chainId: number) {
  const primaryDeposit = settings.primaryDeposit;
  const expiryTimestamp = settings.expiryTimestamp;
  if (typeof primaryDeposit !== "number" || primaryDeposit <= 0) {
    return { ok: false as const, error: "Paid contest create requires a deposit" };
  }
  if (typeof expiryTimestamp !== "number" || expiryTimestamp <= 0) {
    return { ok: false as const, error: "A contest expiry is required" };
  }
  const referralNetworkBps =
    typeof settings.referralNetworkBps === "number"
      ? settings.referralNetworkBps
      : typeof settings.oracleFeeBps === "number"
        ? settings.oracleFeeBps
        : 0;
  const subsidyBps =
    typeof settings.primaryDepositSecondarySubsidyBps === "number"
      ? settings.primaryDepositSecondarySubsidyBps
      : 0;
  return {
    ok: true as const,
    primaryDepositAmount: primaryDepositWeiFromSettings(primaryDeposit, chainId),
    referralNetworkBps: BigInt(referralNetworkBps),
    expiryTimestamp: BigInt(expiryTimestamp),
    primaryDepositSecondarySubsidyBps: BigInt(subsidyBps),
  };
}

export async function executeCreateContest(
  input: CreateContestActionInput,
  deps: CreateContestDeps,
): Promise<CreateContestActionResult> {
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
  if (!readQuorumApproval(delegate.approval)) {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  const approval = delegate.approval;

  const userType = await deps.loadUserType(userId);
  if (!userType) return { ok: false, status: 404, error: "User not found" };
  if (input.userGroupId) {
    const admin = await deps.isLeagueAdmin(userId, input.userGroupId);
    if (!admin) {
      return {
        ok: false,
        status: 403,
        error: "You must be a league admin to create contests for this group",
      };
    }
  } else if (!isStaffUserType(userType)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (!(await deps.eventExists(input.eventId))) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  const action = withDefaultExpiry(input);
  const amounts = depositArgs(action.settings, action.chainId);
  if (!amounts.ok) return { ok: false, status: 400, error: amounts.error };
  const factory = deps.factoryAddress(input.chainId);
  if (!factory) return { ok: false, status: 400, error: "Contest factory is not configured" };

  const call = buildCreateContestCall({
    factory,
    primaryDepositAmount: amounts.primaryDepositAmount,
    referralNetworkBps: amounts.referralNetworkBps,
    expiryTimestamp: amounts.expiryTimestamp,
    primaryDepositSecondarySubsidyBps: amounts.primaryDepositSecondarySubsidyBps,
  });
  try {
    assertCreateContestCall(call, {
      factory,
      primaryDepositAmount: amounts.primaryDepositAmount,
      referralNetworkBps: amounts.referralNetworkBps,
      expiryTimestamp: amounts.expiryTimestamp,
      primaryDepositSecondarySubsidyBps: amounts.primaryDepositSecondarySubsidyBps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contest create calls rejected";
    await deps.log(userId, "error", message);
    return { ok: false, status: 400, error: message };
  }

  const calls: BotCall[] = [call];
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
      userOpHash: relayed.userOpHash,
      userOp: relayed.userOp,
      calls: serializeBotCalls(calls),
      authorization: relayed.authorization,
    };
  }
  if (relayed.kind === "error") {
    await deps.log(userId, "error", relayed.error);
    return { ok: false, status: relayed.status, error: relayed.error };
  }
  if (relayed.kind !== "submitted") {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  const txHash = relayed.txHash;

  const created = await deps.readCreatedAddress({
    chainId: input.chainId,
    transactionHash: txHash,
  });
  if (!created.ok) {
    await deps.log(userId, "error", created.error);
    return { ok: false, status: 400, error: created.error };
  }

  const recorded = await deps.recordContest({
    ...action,
    address: created.contestAddress,
    transactionHash: txHash,
  });
  if (!recorded.ok) {
    await deps.log(userId, "error", recorded.error);
    return recorded;
  }
  await deps.log(userId, "createContest");
  return { ok: true, contestId: recorded.contestId, address: recorded.address };
}

export function createContestActionDeps(): CreateContestDeps {
  const actor = createBotActionDeps();
  return {
    findDelegate: actor.findDelegate,
    log: actor.log,
    loadUserType: async (userId) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userType: true },
      });
      return user?.userType ?? null;
    },
    isLeagueAdmin: isUserGroupAdmin,
    eventExists: async (eventId) => {
      const event = await prisma.competitionEvent.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      return Boolean(event);
    },
    factoryAddress: getContestFactoryAddress,
    readCreatedAddress: async (input) => {
      const read = await readFactoryCreatedContestAddress(input);
      if (!read.ok) {
        return { ok: false, error: FACTORY_CONTEST_VERIFY_MESSAGES[read.error] };
      }
      return { ok: true, contestAddress: read.contestAddress };
    },
    recordContest: async (input) => {
      const recorded = await recordPaidContest({
        name: input.name,
        description: input.description,
        eventId: input.eventId,
        userGroupId: input.userGroupId,
        endTime: input.endTime,
        chainId: input.chainId,
        address: input.address,
        host: input.smartWallet,
        transactionHash: input.transactionHash,
        settings: input.settings,
        notifyLeagueMembers: input.notifyLeagueMembers,
      });
      if (!recorded.ok) return recorded;
      return {
        ok: true,
        contestId: recorded.contest.id,
        address: recorded.contest.address ?? input.address,
      };
    },
  };
}
