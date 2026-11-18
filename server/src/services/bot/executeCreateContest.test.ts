import { decodeFunctionData, getAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { packApproval } from "./approvalEnvelope.js";
import { executeCreateContest, type CreateContestDeps } from "./executeCreateContest.js";
import type { BotDelegateRow } from "./executeBotAction.js";

const CHAIN_ID = 84532;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const FACTORY = getAddress("0x4444444444444444444444444444444444444444");
const CREATED = getAddress("0x5555555555555555555555555555555555555555");
const TX = `0x${"ab".repeat(32)}` as Hex;
const USER_ID = "user-1";

const cutBotKey = generatePrivateKey();
const cutBot = privateKeyToAccount(cutBotKey);

function delegate(overrides: Partial<BotDelegateRow> = {}): BotDelegateRow {
  return {
    userId: USER_ID,
    smartWallet: SMART_WALLET.toLowerCase(),
    delegateAddress: cutBot.address.toLowerCase(),
    kind: "cut_bot",
    approval: packApproval({ approval: "serialized", permissionId: "0x5a677774" }),
    ...overrides,
  };
}

function deps(partial: Partial<CreateContestDeps> = {}): CreateContestDeps {
  return {
    findDelegate: vi.fn(async () => delegate()),
    findOwner: vi.fn(async () => null),
    sessionEnabled: vi.fn(async () => true),
    prepareUserOp: vi.fn(async () => ({ ok: false as const, error: "prepare was not expected" })),
    prepareOwnerTransaction: vi.fn(async () => ({
      ok: false as const,
      error: "owner prepare was not expected",
    })),
    submitOwnerTransaction: vi.fn(async () => ({
      ok: false as const,
      error: "owner submit was not expected",
    })),
    submitCalls: vi.fn(async () => ({ ok: true as const, txHash: TX })),
    log: vi.fn(async () => undefined),
    loadUserType: vi.fn(async () => "AGENT"),
    isLeagueAdmin: vi.fn(async () => true),
    eventExists: vi.fn(async () => true),
    factoryAddress: vi.fn(() => FACTORY),
    readCreatedAddress: vi.fn(async () => ({ ok: true as const, contestAddress: CREATED })),
    recordContest: vi.fn(async () => ({
      ok: true as const,
      contestId: "contest-1",
      address: CREATED,
    })),
    ...partial,
  };
}

const input = {
  chainId: CHAIN_ID,
  smartWallet: SMART_WALLET,
  signer: cutBot.address,
  name: "Sunday",
  eventId: "clh0000000000000000000001",
  userGroupId: "clh0000000000000000000002",
  endTime: new Date("2026-11-20T00:00:00.000Z"),
  settings: {
    primaryDeposit: 5,
    expiryTimestamp: 1_800_000_000,
    referralNetworkBps: 500,
    primaryDepositSecondarySubsidyBps: 0,
  },
};

describe("executeCreateContest", () => {
  const previous = process.env.CUT_BOT_DELEGATE_PRIVATE_KEY;
  beforeEach(() => {
    process.env.CUT_BOT_DELEGATE_PRIVATE_KEY = cutBotKey;
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.CUT_BOT_DELEGATE_PRIVATE_KEY;
    else process.env.CUT_BOT_DELEGATE_PRIVATE_KEY = previous;
  });
  it("submits the factory call and records the contest for a league admin", async () => {
    const used = deps();
    const result = await executeCreateContest(input, used);
    expect(result).toEqual({ ok: true, contestId: "contest-1", address: CREATED });
    expect(used.submitCalls).toHaveBeenCalledOnce();
    const calls = vi.mocked(used.submitCalls).mock.calls[0]?.[0].calls;
    expect(calls?.[0]?.to).toBe(FACTORY);
    expect(calls?.[0]?.value).toBe(0n);
    expect(used.recordContest).toHaveBeenCalledWith(
      expect.objectContaining({
        address: CREATED,
        transactionHash: TX,
        settings: expect.objectContaining({ expiryTimestamp: 1_800_000_000 }),
      }),
    );
  });

  it("defaults expiryTimestamp from endTime when the body omits it", async () => {
    const used = deps();
    const endTime = new Date("2026-11-20T00:00:00.000Z");
    const expiryTimestamp = Math.floor(endTime.getTime() / 1000);
    const settings = {
      primaryDeposit: input.settings.primaryDeposit,
      referralNetworkBps: input.settings.referralNetworkBps,
      primaryDepositSecondarySubsidyBps: input.settings.primaryDepositSecondarySubsidyBps,
    };
    const result = await executeCreateContest({ ...input, endTime, settings }, used);
    expect(result).toEqual({ ok: true, contestId: "contest-1", address: CREATED });
    const call = vi.mocked(used.submitCalls).mock.calls[0]?.[0].calls[0];
    expect(call).toBeDefined();
    const decoded = decodeFunctionData({
      abi: [
        {
          type: "function",
          name: "createContest",
          stateMutability: "nonpayable",
          inputs: [
            { name: "contestantDepositAmount", type: "uint256" },
            { name: "referralNetworkBps", type: "uint256" },
            { name: "expiry", type: "uint256" },
            { name: "primaryDepositSecondarySubsidyBps", type: "uint256" },
          ],
          outputs: [{ name: "", type: "address" }],
        },
      ],
      data: call!.data,
    });
    expect(decoded.args[2]).toBe(BigInt(expiryTimestamp));
    expect(used.recordContest).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ expiryTimestamp }),
      }),
    );
  });

  it("rejects a public contest for an AGENT", async () => {
    const used = deps();
    const result = await executeCreateContest({ ...input, userGroupId: undefined }, used);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
    expect(used.submitCalls).not.toHaveBeenCalled();
  });

  it("rejects a paid create without a verified contest address", async () => {
    const used = deps({
      readCreatedAddress: vi.fn(async () => ({
        ok: false as const,
        error: "Transaction did not create a contest from the configured factory",
      })),
    });
    const result = await executeCreateContest(input, used);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(used.recordContest).not.toHaveBeenCalled();
  });
});
