import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAddress, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";
import { assertJoinCalls, buildJoinCalls } from "./botCalls.js";
import type { BotActor, BotDelegateRow } from "./botActor.js";
import {
  executeBotAction,
  type BotActionDeps,
  type BotContest,
  type ExecuteBotActionInput,
} from "./executeBotAction.js";
import { cutDelegateApproval } from "../../test/delegateApproval.js";

const CHAIN_ID = 84532;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const CONTEST = getAddress("0x2222222222222222222222222222222222222222");
const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
const USER_ID = "user-1";

const cutBotKey = generatePrivateKey();
const cutBot = privateKeyToAccount(cutBotKey);
const owner = privateKeyToAccount(generatePrivateKey());
const external = privateKeyToAccount(generatePrivateKey());
// A real Cut delegate approval (NoSelfCallPolicy at the test policy address).
const { approval: APPROVAL } = await cutDelegateApproval({
  smartWallet: SMART_WALLET,
  delegate: cutBot.address,
});

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

function delegateActor(kind: "cut_bot" | "external" = "cut_bot"): BotActor {
  const signer = kind === "cut_bot" ? cutBot.address : external.address;
  const delegate: BotDelegateRow = {
    userId: USER_ID,
    smartWallet: SMART_WALLET.toLowerCase(),
    delegateAddress: signer.toLowerCase(),
    kind,
    approval: "{}",
  };
  return {
    role: "delegate",
    userId: USER_ID,
    smartWallet: SMART_WALLET,
    signer: getAddress(signer),
    delegate,
    approval: APPROVAL,
    permissionId: "0x5a677774",
  };
}

const ownerActor: BotActor = {
  role: "owner",
  userId: USER_ID,
  smartWallet: SMART_WALLET,
  signer: getAddress(owner.address),
};

const PREPARED_USER_OP = {
  sender: SMART_WALLET,
  nonce: "0",
  callData: "0x1234" as Hex,
  callGasLimit: "1",
  verificationGasLimit: "1",
  preVerificationGas: "1",
  maxFeePerGas: "1",
  maxPriorityFeePerGas: "1",
};

function deps(partial: Partial<BotActionDeps> = {}): BotActionDeps {
  return {
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
      ok: true as const,
      userOpHash: ("0x" + "ab".repeat(32)) as Hex,
      userOp: PREPARED_USER_OP,
    })),
    submitCalls: vi.fn(async () => ({ ok: true as const })),
    ...partial,
  };
}

function join(actor: BotActor, extra: Partial<ExecuteBotActionInput> = {}): ExecuteBotActionInput {
  return {
    chainId: CHAIN_ID,
    action: "join",
    actor,
    contestId: "contest-1",
    lineupId: "lineup-1",
    picks: [],
    ...extra,
  };
}

async function withCutBotKey<T>(fn: () => Promise<T>): Promise<T> {
  const previous = process.env.CUT_BOT_DELEGATE_PRIVATE_KEY;
  process.env.CUT_BOT_DELEGATE_PRIVATE_KEY = cutBotKey;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.CUT_BOT_DELEGATE_PRIVATE_KEY;
    else process.env.CUT_BOT_DELEGATE_PRIVATE_KEY = previous;
  }
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
  it("saves a lineup without submitting a user operation", async () => {
    const used = deps();
    const result = await executeBotAction(
      { ...join(ownerActor), action: "lineupUpsert", lineupId: "", picks: ["p1", "p2"] },
      used,
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.createLineup).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, picks: ["p1", "p2"] }),
    );
    expect(used.submitCalls).not.toHaveBeenCalled();
    expect(used.prepareUserOp).not.toHaveBeenCalled();
  });

  it("rejects a contest on another chain", async () => {
    const used = deps({ loadContest: vi.fn(async () => contest({ chainId: 8453 })) });
    const result = await executeBotAction(join(ownerActor), used);
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("rejects a league contest the user is not in", async () => {
    const used = deps({
      loadContest: vi.fn(async () => contest({ userGroupId: "league-1" })),
      isGroupMember: vi.fn(async () => false),
    });
    const result = await executeBotAction(join(ownerActor), used);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("Cut Bot joins in one request: the server signs with its own key", async () => {
    const used = deps();
    const result = await withCutBotKey(() =>
      executeBotAction(join(delegateActor("cut_bot")), used),
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.prepareUserOp).not.toHaveBeenCalled();
    expect(used.submitCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: cutBotKey,
        authority: expect.objectContaining({ kind: "session", approval: APPROVAL }),
      }),
    );
    expect(used.insertContestEntry).toHaveBeenCalledOnce();
    expect(used.createLineup).not.toHaveBeenCalled();
    expect(used.updateLineup).not.toHaveBeenCalled();
  });

  it("does not create a contest entry when the join user operation fails", async () => {
    const used = deps({
      submitCalls: vi.fn(async () => ({ ok: false as const, error: "bundler reverted" })),
    });
    const result = await withCutBotKey(() =>
      executeBotAction(join(delegateActor("cut_bot")), used),
    );
    expect(result).toMatchObject({ ok: false, status: 502, error: "bundler reverted" });
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("the owner key prepares a user operation with the owner (sudo) authority", async () => {
    const used = deps();
    const result = await executeBotAction(join(ownerActor), used);
    expect(result).toMatchObject({ ok: true, preparedUserOp: true, lineupId: "lineup-1" });
    expect(used.prepareUserOp).toHaveBeenCalledWith(
      expect.objectContaining({
        authority: { kind: "owner", ownerAddress: getAddress(owner.address) },
        smartWallet: SMART_WALLET,
      }),
    );
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("the owner key submits its signed user operation and records the entry", async () => {
    const used = deps();
    const result = await executeBotAction(
      join(ownerActor, { userOpSignature: "0xdead" as Hex, userOp: PREPARED_USER_OP }),
      used,
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    const call = (used.submitCalls as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toMatchObject({
      authority: { kind: "owner" },
      userOpSignature: "0xdead",
      userOp: PREPARED_USER_OP,
    });
    expect(call).not.toHaveProperty("privateKey");
    expect(used.insertContestEntry).toHaveBeenCalledOnce();
  });

  it("an external delegate uses the same prepare-then-sign flow", async () => {
    const used = deps();
    const result = await executeBotAction(join(delegateActor("external")), used);
    expect(result).toMatchObject({ ok: true, preparedUserOp: true });
    expect(used.prepareUserOp).toHaveBeenCalledWith(
      expect.objectContaining({
        authority: {
          kind: "session",
          approval: APPROVAL,
          delegateAddress: getAddress(external.address),
        },
      }),
    );
  });

  it("builds a delegate join for any contest (no per-contest grant)", async () => {
    const other = getAddress("0x4444444444444444444444444444444444444444");
    const used = deps({ loadContest: vi.fn(async () => contest({ address: other })) });
    const result = await executeBotAction(join(delegateActor("external")), used);
    expect(result).toMatchObject({ ok: true });
    expect(used.prepareUserOp).toHaveBeenCalledOnce();
  });

  it("rejects a userOpSignature without the prepared userOp", async () => {
    const used = deps();
    const result = await executeBotAction(
      join(ownerActor, { userOpSignature: "0xdead" as Hex }),
      used,
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(used.submitCalls).not.toHaveBeenCalled();
  });

  it("leave submits removePrimaryPosition and deletes the entry", async () => {
    const used = deps({ findContestEntry: vi.fn(async () => ({ id: "entry-1" })) });
    const result = await withCutBotKey(() =>
      executeBotAction({ ...join(delegateActor("cut_bot")), action: "leave" }, used),
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.deleteContestEntry).toHaveBeenCalledWith("contest-1", "lineup-1", USER_ID);
  });

  it("refuses a lineup that belongs to someone else", async () => {
    const used = deps({
      findLineup: vi.fn(async () => ({
        id: "lineup-1",
        userId: "someone-else",
        eventId: "event-1",
        contestId: "contest-1",
        picks: ["p1"],
      })),
    });
    const result = await executeBotAction(join(ownerActor), used);
    expect(result).toMatchObject({ ok: false, status: 400, error: "Lineup not found" });
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
