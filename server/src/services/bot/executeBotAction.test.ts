import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { kernelWalletAddress } from "@playthecut/agent";
import { describe, expect, it, vi } from "vitest";
import { generateContestEntryId } from "../../utils/contestEntryId.js";
import { packApproval } from "./approvalEnvelope.js";
import { assertJoinCalls, buildJoinCalls } from "./botCalls.js";
import {
  executeBotAction,
  type BotActionDeps,
  type BotContest,
  type BotDelegateRow,
  type ExecuteBotActionInput,
} from "./executeBotAction.js";

const CHAIN_ID = 84532;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const CONTEST = getAddress("0x2222222222222222222222222222222222222222");
const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
const USER_ID = "user-1";

const delegateAccount = privateKeyToAccount(generatePrivateKey());
const stranger = privateKeyToAccount(generatePrivateKey());
const USER_OP = {
  sender: SMART_WALLET,
  nonce: "1",
  callData: "0x" as Hex,
  callGasLimit: "1",
  verificationGasLimit: "1",
  preVerificationGas: "1",
  maxFeePerGas: "1",
  maxPriorityFeePerGas: "1",
};
const USER_OP_SIGNATURE = `0x${"11".repeat(65)}` as Hex;

function contest(overrides: Partial<BotContest> = {}): BotContest {
  return {
    id: "contest-1",
    eventId: "event-1",
    userGroupId: null,
    address: CONTEST,
    chainId: CHAIN_ID,
    status: "OPEN",
    paymentToken: TOKEN,
    depositWei: 5_000_000n,
    ...overrides,
  };
}

function delegate(overrides: Partial<BotDelegateRow> = {}): BotDelegateRow {
  return {
    userId: USER_ID,
    smartWallet: SMART_WALLET.toLowerCase(),
    delegateAddress: delegateAccount.address.toLowerCase(),
    approval: packApproval({ approval: "serialized", permissionId: "0x5a677774" }),
    ...overrides,
  };
}

function deps(partial: Partial<BotActionDeps> = {}): BotActionDeps {
  return {
    findDelegate: vi.fn(async () => delegate()),
    findOwner: vi.fn(async () => null),
    sessionEnabled: vi.fn(async () => true),
    loadContest: vi.fn(async () => contest()),
    isGroupMember: vi.fn(async () => true),
    findLineup: vi.fn(async () => ({
      id: "lineup-1",
      userId: USER_ID,
      eventId: "event-1",
      contestId: "contest-1",
      picks: ["p1"],
    })),
    findLineupByPicks: vi.fn(async () => null),
    createLineup: vi.fn(async () => ({
      ok: true as const,
      lineup: {
        id: "lineup-1",
        userId: USER_ID,
        eventId: "event-1",
        contestId: "contest-1",
        picks: ["p1"],
      },
    })),
    findContestEntry: vi.fn(async () => null),
    insertContestEntry: vi.fn(async () => undefined),
    deleteContestEntry: vi.fn(async () => true),
    updateLineup: vi.fn(async () => ({ ok: true as const })),
    prepareUserOp: vi.fn(async () => ({
      ok: false as const,
      error: "prepare was not expected",
    })),
    prepareOwnerUserOp: vi.fn(async () => ({
      ok: false as const,
      error: "owner prepare was not expected",
    })),
    submitOwnerUserOp: vi.fn(async () => ({
      ok: false as const,
      error: "owner submit was not expected",
    })),
    submitCalls: vi.fn(async () => ({ ok: true as const })),
    log: vi.fn(async () => undefined),
    ...partial,
  };
}

function signedJoin(signer: Address = delegateAccount.address, lineupId = "lineup-1"): ExecuteBotActionInput {
  return {
    chainId: CHAIN_ID,
    action: "join",
    smartWallet: SMART_WALLET,
    contestId: "contest-1",
    lineupId,
    picks: [],
    signer,
    userOp: USER_OP,
    userOpSignature: USER_OP_SIGNATURE,
  };
}

describe("assertJoinCalls", () => {
  const expected = {
    paymentToken: TOKEN,
    contest: CONTEST,
    depositWei: 5_000_000n,
    entryId: 7n,
  };

  it("accepts approve to the contest for the deposit, then addPrimaryPosition", () => {
    const calls = buildJoinCalls(expected);
    expect(() => assertJoinCalls(calls, expected)).not.toThrow();
  });

  it("rejects an approve whose amount is not the contest deposit", () => {
    const calls = buildJoinCalls({ ...expected, depositWei: 1n });
    expect(() => assertJoinCalls(calls, expected)).toThrow(/amount must be the contest deposit/);
  });

  it("rejects an approve whose spender is not the contest", () => {
    const calls = buildJoinCalls({
      ...expected,
      contest: getAddress("0x5555555555555555555555555555555555555555"),
    });
    calls[1] = buildJoinCalls(expected)[1];
    expect(() => assertJoinCalls(calls, expected)).toThrow(/spender must be the contest/);
  });
});

describe("executeBotAction", () => {
  it("rejects a signature from an address that is not a delegate", async () => {
    const used = deps({ findDelegate: vi.fn(async () => null) });
    const result = await executeBotAction(signedJoin(stranger.address, ""), used);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(used.insertContestEntry).not.toHaveBeenCalled();
    expect(used.log).not.toHaveBeenCalled();
  });

  it("rejects a revoked session key and logs only the error", async () => {
    const log = vi.fn(async () => undefined);
    const used = deps({
      sessionEnabled: vi.fn(async () => false),
      log,
    });
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({ ok: false, error: "Session key is not enabled" });
    expect(used.insertContestEntry).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]).toEqual([USER_ID, "error", "Session key is not enabled"]);
  });

  it("does not create a contest entry when the join user operation fails", async () => {
    const log = vi.fn(async () => undefined);
    const insertContestEntry = vi.fn(async () => undefined);
    const used = deps({
      submitCalls: vi.fn(async () => ({ ok: false as const, error: "bundler reverted" })),
      log,
      insertContestEntry,
    });
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({ ok: false, error: "bundler reverted" });
    expect(insertContestEntry).not.toHaveBeenCalled();
    expect(log.mock.calls[0]?.slice(0, 2)).toEqual([USER_ID, "error"]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("contest-1");
  });

  it("saves a lineup without submitting a user operation", async () => {
    const log = vi.fn(async () => undefined);
    const used = deps({ log });
    const result = await executeBotAction(
      {
        chainId: CHAIN_ID,
        action: "lineupUpsert",
        smartWallet: SMART_WALLET,
        contestId: "contest-1",
        lineupId: "",
        picks: ["p1", "p2"],
        signer: delegateAccount.address,
      },
      used,
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(log).toHaveBeenCalledWith(USER_ID, "lineupUpsert");
    expect(used.createLineup).toHaveBeenCalledOnce();
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.prepareUserOp).not.toHaveBeenCalled();
  });

  it("rejects a join when the lineup has no picks", async () => {
    const used = deps({
      findLineup: vi.fn(async () => ({
        id: "lineup-1",
        userId: USER_ID,
        eventId: "event-1",
        contestId: "contest-1",
        picks: [],
      })),
    });
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "Lineup must have at least 1 player",
    });
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("joins an existing lineup and does not write picks", async () => {
    const used = deps();
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.createLineup).not.toHaveBeenCalled();
    expect(used.updateLineup).not.toHaveBeenCalled();
    expect(used.submitCalls).toHaveBeenCalledOnce();
  });

  it("saves a lineup signed by the wallet owner", async () => {
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: USER_ID })),
    });
    const result = await executeBotAction(
      {
        chainId: CHAIN_ID,
        action: "lineupUpsert",
        smartWallet: SMART_WALLET,
        contestId: "contest-1",
        lineupId: "",
        picks: ["p1", "p2"],
        signer: SMART_WALLET,
      },
      used,
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.sessionEnabled).not.toHaveBeenCalled();
    expect(used.submitCalls).not.toHaveBeenCalled();
  });

  it("records an off-chain join from the account key without a delegate", async () => {
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: USER_ID })),
      loadContest: vi.fn(async () => contest({ address: null, paymentToken: null, depositWei: 0n })),
    });
    const result = await executeBotAction(signedJoin(SMART_WALLET), used);
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.prepareOwnerUserOp).not.toHaveBeenCalled();
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.insertContestEntry).toHaveBeenCalledWith({
      contestId: "contest-1",
      lineupId: "lineup-1",
      userId: USER_ID,
      entryId: null,
    });
  });

  it("prepares a user operation when the delegate has not signed", async () => {
    const userOpHash = `0x${"ab".repeat(32)}` as Hex;
    const used = deps({
      prepareUserOp: vi.fn(async () => ({ ok: true as const, userOpHash, userOp: USER_OP })),
    });
    const unsigned = { ...signedJoin(), userOp: undefined, userOpSignature: undefined };
    const result = await executeBotAction(unsigned, used);
    expect(result).toEqual({
      ok: true,
      preparedUserOp: true,
      lineupId: "lineup-1",
      userOpHash,
      userOp: USER_OP,
    });
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("prepares one sponsored user operation for the account key", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const wallet = kernelWalletAddress(owner.address, CHAIN_ID);
    const userOpHash = `0x${"ab".repeat(32)}` as Hex;
    const userOp = {
      sender: wallet,
      nonce: "1",
      callData: "0x" as Hex,
      callGasLimit: "1",
      verificationGasLimit: "1",
      preVerificationGas: "1",
      maxFeePerGas: "1",
      maxPriorityFeePerGas: "1",
    };
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: USER_ID })),
      prepareOwnerUserOp: vi.fn(async () => ({ ok: true as const, userOpHash, userOp })),
    });
    const result = await executeBotAction(
      {
        ...signedJoin(owner.address),
        smartWallet: wallet,
        userOp: undefined,
        userOpSignature: undefined,
      },
      used,
    );
    expect(result).toEqual({
      ok: true,
      preparedUserOp: true,
      lineupId: "lineup-1",
      userOpHash,
      userOp,
    });
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.insertContestEntry).not.toHaveBeenCalled();
    expect(used.prepareOwnerUserOp).toHaveBeenCalledOnce();
    const preparedCalls = vi.mocked(used.prepareOwnerUserOp).mock.calls[0]?.[0].calls;
    expect(preparedCalls).toHaveLength(2);
  });

  it("stores the entry after the account key's user operation", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const wallet = kernelWalletAddress(owner.address, CHAIN_ID);
    const entryId = BigInt(generateContestEntryId(CONTEST, "lineup-1"));
    const userOp = {
      sender: wallet,
      nonce: "1",
      callData: "0x" as Hex,
      callGasLimit: "1",
      verificationGasLimit: "1",
      preVerificationGas: "1",
      maxFeePerGas: "1",
      maxPriorityFeePerGas: "1",
    };
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: USER_ID })),
      submitOwnerUserOp: vi.fn(async () => ({ ok: true as const, txHash: `0x${"cd".repeat(32)}` as Hex })),
    });
    const result = await executeBotAction(
      {
        ...signedJoin(owner.address),
        smartWallet: wallet,
        userOp,
        userOpSignature: `0x${"11".repeat(65)}` as Hex,
      },
      used,
    );
    expect(result).toEqual({ ok: true, lineupId: "lineup-1" });
    expect(used.prepareOwnerUserOp).not.toHaveBeenCalled();
    expect(used.submitOwnerUserOp).toHaveBeenCalledOnce();
    expect(used.insertContestEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, entryId: String(entryId) }),
    );
  });
});

describe("client join", () => {
  it("does not go through the bot action API", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      path.resolve(here, "../../../../client/src/hooks/useContestLineupEntry.ts"),
      "utf8",
    );
    expect(source).toContain("useJoinContest");
    expect(source).not.toContain("/bot/actions");
  });
});
