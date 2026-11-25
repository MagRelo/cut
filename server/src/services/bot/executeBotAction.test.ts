import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDelegateKey } from "@playthecut/agent";
import { getAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateContestEntryId } from "../../utils/contestEntryId.js";
import { assertJoinCalls, buildJoinCalls, serializeBotCalls } from "./botCalls.js";
import {
  executeBotAction,
  type BotActionDeps,
  type BotContest,
  type BotDelegateRow,
  type ExecuteBotActionInput,
} from "./executeBotAction.js";
import { writeQuorumApproval } from "./quorumApproval.js";
import { relayQuorumUserOp } from "./quorumUserOp.js";

vi.mock("./quorumUserOp.js", () => ({
  relayQuorumUserOp: vi.fn(),
}));

const CHAIN_ID = 84532;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const CONTEST = getAddress("0x2222222222222222222222222222222222222222");
const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
const USER_ID = "user-1";
const KEY = generateDelegateKey();
const USER_OP_HASH = `0x${"ab".repeat(32)}` as Hex;
const TX = `0x${"cd".repeat(32)}` as Hex;

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

function approval(): string {
  return writeQuorumApproval({
    quorumId: "quorum-1",
    publicKey: KEY.publicKey,
    embeddedWalletId: "wallet-1",
    embeddedAddress: SMART_WALLET,
  });
}

function delegate(overrides: Partial<BotDelegateRow> = {}): BotDelegateRow {
  return {
    userId: USER_ID,
    smartWallet: SMART_WALLET.toLowerCase(),
    delegateAddress: KEY.publicKey,
    approval: approval(),
    ...overrides,
  };
}

function deps(partial: Partial<BotActionDeps> = {}): BotActionDeps {
  return {
    findDelegate: vi.fn(async () => delegate()),
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
    log: vi.fn(async () => undefined),
    ...partial,
  };
}

function signedJoin(signer: string = KEY.publicKey, lineupId = "lineup-1"): ExecuteBotActionInput {
  return {
    chainId: CHAIN_ID,
    action: "join",
    smartWallet: SMART_WALLET,
    contestId: "contest-1",
    lineupId,
    picks: [],
    signer,
    userOp: USER_OP,
    authorizationSignature: "sig",
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
  beforeEach(() => {
    vi.mocked(relayQuorumUserOp).mockReset();
    vi.mocked(relayQuorumUserOp).mockResolvedValue({ kind: "submitted", txHash: TX });
  });

  it("rejects a signature from an address that is not a delegate", async () => {
    const used = deps();
    const result = await executeBotAction(
      signedJoin("0x4444444444444444444444444444444444444444", ""),
      used,
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("rejects a delegate whose approval is not a quorum and logs only the error", async () => {
    const log = vi.fn(async () => undefined);
    const used = deps({
      findDelegate: vi.fn(async () => delegate({ approval: "not-a-quorum" })),
      log,
    });
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({ ok: false, status: 400, error: "Invalid delegate approval" });
    expect(used.insertContestEntry).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
  });

  it("does not create a contest entry when the join user operation fails", async () => {
    vi.mocked(relayQuorumUserOp).mockResolvedValue({
      kind: "error",
      status: 502,
      error: "bundler reverted",
    });
    const log = vi.fn(async () => undefined);
    const insertContestEntry = vi.fn(async () => undefined);
    const used = deps({ log, insertContestEntry });
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
        signer: KEY.publicKey,
      },
      used,
    );
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(log).toHaveBeenCalledWith(USER_ID, "lineupUpsert");
    expect(used.createLineup).toHaveBeenCalledOnce();
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
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
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("joins an existing lineup and does not write picks", async () => {
    const used = deps();
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toMatchObject({ ok: true, lineupId: "lineup-1" });
    expect(used.createLineup).not.toHaveBeenCalled();
    expect(used.updateLineup).not.toHaveBeenCalled();
    expect(relayQuorumUserOp).toHaveBeenCalledOnce();
    expect(used.insertContestEntry).toHaveBeenCalledOnce();
  });

  it("rejects a lineup signed by the wallet address", async () => {
    const used = deps();
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
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      error: "No active delegate for this signature",
    });
    expect(used.findDelegate).not.toHaveBeenCalled();
  });

  it("prepares a user operation when the delegate has not signed", async () => {
    vi.mocked(relayQuorumUserOp).mockResolvedValue({
      kind: "prepared",
      userOpHash: USER_OP_HASH,
      userOp: USER_OP,
      authorization: { method: "POST" },
    });
    const used = deps();
    const unsigned = { ...signedJoin(), userOp: undefined, authorizationSignature: undefined };
    const result = await executeBotAction(unsigned, used);
    expect(result).toEqual({
      ok: true,
      preparedUserOp: true,
      lineupId: "lineup-1",
      userOpHash: USER_OP_HASH,
      userOp: USER_OP,
      calls: serializeBotCalls(
        buildJoinCalls({
          paymentToken: TOKEN,
          contest: CONTEST,
          depositWei: 5_000_000n,
          entryId: BigInt(generateContestEntryId(CONTEST, "lineup-1")),
        }),
      ),
      authorization: { method: "POST" },
    });
    expect(used.insertContestEntry).not.toHaveBeenCalled();
  });

  it("stores the entry after the quorum user operation", async () => {
    const entryId = BigInt(generateContestEntryId(CONTEST, "lineup-1"));
    const used = deps();
    const result = await executeBotAction(signedJoin(), used);
    expect(result).toEqual({ ok: true, lineupId: "lineup-1" });
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
