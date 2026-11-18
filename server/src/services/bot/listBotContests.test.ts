import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { kernelWalletAddress } from "@playthecut/agent";
import { describe, expect, it, vi } from "vitest";
import { listSignedBotContests, type ListBotContestsDeps } from "./listBotContests.js";

const CHAIN_ID = 8453;
const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const delegate = privateKeyToAccount(generatePrivateKey());

function deps(partial: Partial<ListBotContestsDeps> = {}): ListBotContestsDeps {
  return {
    findDelegate: vi.fn(async () => ({ userId: "user-1" })),
    findOwner: vi.fn(async () => null),
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

describe("listSignedBotContests", () => {
  it("returns visible contests and loads each event field once", async () => {
    const used = deps();
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        signer: delegate.address,
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

  it("rejects a signer that is not an active delegate", async () => {
    const used = deps({ findDelegate: vi.fn(async () => null) });
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        signer: delegate.address,
      },
      used,
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(used.loadContests).not.toHaveBeenCalled();
  });

  it("lists contests for the wallet owner", async () => {
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: "owner-1" })),
    });
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: SMART_WALLET,
        signer: SMART_WALLET,
      },
      used,
    );
    expect(result.ok).toBe(true);
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.loadContests).toHaveBeenCalledWith("owner-1", CHAIN_ID);
  });

  it("lists contests for the owner key of a Kernel wallet", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const wallet = kernelWalletAddress(owner.address, CHAIN_ID);
    const used = deps({
      findOwner: vi.fn(async () => ({ userId: "owner-1" })),
    });
    const result = await listSignedBotContests(
      {
        chainId: CHAIN_ID,
        smartWallet: wallet,
        signer: owner.address,
      },
      used,
    );
    expect(result.ok).toBe(true);
    expect(used.findDelegate).not.toHaveBeenCalled();
    expect(used.findOwner).toHaveBeenCalledWith(wallet, CHAIN_ID);
  });
});
