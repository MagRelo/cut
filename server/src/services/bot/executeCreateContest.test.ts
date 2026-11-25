import { generateDelegateKey } from "@playthecut/agent";
import { decodeFunctionData, getAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCreateContestCall, serializeBotCalls } from "./botCalls.js";
import { executeCreateContest, type CreateContestDeps } from "./executeCreateContest.js";
import type { BotDelegateRow } from "./executeBotAction.js";
import { writeQuorumApproval } from "./quorumApproval.js";
import { relayQuorumUserOp } from "./quorumUserOp.js";

vi.mock("./quorumUserOp.js", () => ({
  relayQuorumUserOp: vi.fn(),
}));

const CHAIN_ID = 84532;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const FACTORY = getAddress("0x4444444444444444444444444444444444444444");
const CREATED = getAddress("0x5555555555555555555555555555555555555555");
const TX = `0x${"ab".repeat(32)}` as Hex;
const USER_OP_HASH = `0x${"cd".repeat(32)}` as Hex;
const USER_ID = "user-1";
const KEY = generateDelegateKey();

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

function deps(partial: Partial<CreateContestDeps> = {}): CreateContestDeps {
  return {
    findDelegate: vi.fn(async () => delegate()),
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
  signer: KEY.publicKey,
  userOp: USER_OP,
  authorizationSignature: "sig",
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
  beforeEach(() => {
    vi.mocked(relayQuorumUserOp).mockReset();
    vi.mocked(relayQuorumUserOp).mockResolvedValue({ kind: "submitted", txHash: TX });
  });

  it("prepares a user operation when the delegate has not signed", async () => {
    vi.mocked(relayQuorumUserOp).mockResolvedValue({
      kind: "prepared",
      userOpHash: USER_OP_HASH,
      userOp: USER_OP,
      authorization: { method: "POST" },
    });
    const used = deps();
    const unsigned = { ...input, userOp: undefined, authorizationSignature: undefined };
    const result = await executeCreateContest(unsigned, used);
    expect(result).toEqual({
      ok: true,
      preparedUserOp: true,
      userOpHash: USER_OP_HASH,
      userOp: USER_OP,
      calls: serializeBotCalls([
        buildCreateContestCall({
          factory: FACTORY,
          primaryDepositAmount: 5_000_000n,
          referralNetworkBps: 500n,
          expiryTimestamp: 1_800_000_000n,
          primaryDepositSecondarySubsidyBps: 0n,
        }),
      ]),
      authorization: { method: "POST" },
    });
    expect(used.recordContest).not.toHaveBeenCalled();
  });

  it("submits the factory call and records the contest for a league admin", async () => {
    const used = deps();
    const result = await executeCreateContest(input, used);
    expect(result).toEqual({ ok: true, contestId: "contest-1", address: CREATED });
    expect(relayQuorumUserOp).toHaveBeenCalledOnce();
    const calls = vi.mocked(relayQuorumUserOp).mock.calls[0]?.[0].calls;
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
    const call = vi.mocked(relayQuorumUserOp).mock.calls[0]?.[0].calls[0];
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
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
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

  it("rejects an address signer", async () => {
    const used = deps();
    const result = await executeCreateContest(
      { ...input, signer: "0x2222222222222222222222222222222222222222" },
      used,
    );
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "No active delegate for this signature",
    });
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
    expect(used.recordContest).not.toHaveBeenCalled();
  });
});
