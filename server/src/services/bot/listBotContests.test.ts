import { describe, expect, it, vi } from "vitest";
import { listBotContests, type ListBotContestsDeps } from "./listBotContests.js";

const CHAIN_ID = 8453;

function deps(partial: Partial<ListBotContestsDeps> = {}): ListBotContestsDeps {
  return {
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

describe("listBotContests", () => {
  it("returns visible contests and loads each event field once", async () => {
    const used = deps();
    const result = await listBotContests({ userId: "user-1", chainId: CHAIN_ID }, used);
    expect(result.contests.map((contest) => contest.contestId)).toEqual([
      "contest-public",
      "contest-league",
    ]);
    expect(result.contests[0]?.candidates[0]?.eventParticipantId).toBe("ep-1");
    expect(used.loadCandidates).toHaveBeenCalledOnce();
    expect(used.loadContests).toHaveBeenCalledWith("user-1", CHAIN_ID);
  });

  it("passes eventId through to narrow the list", async () => {
    const used = deps();
    await listBotContests({ userId: "user-1", chainId: CHAIN_ID, eventId: "event-1" }, used);
    expect(used.loadContests).toHaveBeenCalledWith("user-1", CHAIN_ID, "event-1");
  });
});
