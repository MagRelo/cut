import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import { signBotRead } from "./botActionSignature.js";
import { listSignedBotContests, type ListBotContestsDeps } from "./listBotContests.js";

const CHAIN_ID = 8453;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const key = generatePrivateKey();
const delegate = privateKeyToAccount(key);

function deps(partial: Partial<ListBotContestsDeps> = {}): ListBotContestsDeps {
  return {
    findDelegate: vi.fn(async () => ({ userId: "user-1" })),
    loadContests: vi.fn(async () => [
      {
        id: "contest-public",
        name: "Public",
        eventId: "event-1",
        sportId: "pga-golf",
        chainId: CHAIN_ID,
        status: "OPEN",
        address: "0x2222222222222222222222222222222222222222",
        userGroupId: null,
        userGroupName: null,
        primaryDeposit: 5,
        endTime: new Date("2026-11-16T00:00:00.000Z"),
      },
      {
        id: "contest-league",
        name: "League",
        eventId: "event-1",
        sportId: "pga-golf",
        chainId: CHAIN_ID,
        status: "OPEN",
        address: null,
        userGroupId: "group-1",
        userGroupName: "Friday",
        primaryDeposit: 0,
        endTime: new Date("2026-11-16T00:00:00.000Z"),
      },
    ]),
    loadCandidates: vi.fn(async () => [
      {
        eventParticipantId: "ep-1",
        participantId: "p-1",
        displayName: "Player",
        sortKeys: {},
        metadata: {},
      },
    ]),
    ...partial,
  };
}

async function signed(now = Math.floor(Date.now() / 1000)) {
  const deadline = BigInt(now + 60);
  const signature = await signBotRead(key, {
    action: "contests",
    smartWallet: SMART_WALLET,
    chainId: BigInt(CHAIN_ID),
    deadline,
  });
  return { deadline, signature, nowSeconds: now };
}

describe("listSignedBotContests", () => {
  it("returns visible contests and loads each event field once", async () => {
    const used = deps();
    const auth = await signed();
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        deadline: auth.deadline,
        signature: auth.signature,
        nowSeconds: auth.nowSeconds,
      },
      used,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contests.map((contest) => contest.contestId)).toEqual([
      "contest-public",
      "contest-league",
    ]);
    expect(result.contests[0]?.candidates[0]?.eventParticipantId).toBe("ep-1");
    expect(used.loadCandidates).toHaveBeenCalledOnce();
    expect(used.loadContests).toHaveBeenCalledWith("user-1", CHAIN_ID);
    expect(used.findDelegate).toHaveBeenCalledWith(SMART_WALLET, getAddress(delegate.address));
  });

  it("rejects a signature that is not an active delegate", async () => {
    const used = deps({ findDelegate: vi.fn(async () => null) });
    const auth = await signed();
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        deadline: auth.deadline,
        signature: auth.signature,
        nowSeconds: auth.nowSeconds,
      },
      used,
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(used.loadContests).not.toHaveBeenCalled();
  });

  it("rejects an expired signature", async () => {
    const now = Math.floor(Date.now() / 1000);
    const auth = await signed(now - 120);
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        deadline: auth.deadline,
        signature: auth.signature,
        nowSeconds: now,
      },
      deps(),
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
