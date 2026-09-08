import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {},
}));

vi.mock("../lib/appUrl.js", () => ({
  buildLeagueInviteUrl: (code: string) => `https://playthecut.com/leagues/join/${code}`,
}));

import { formatUserGroupDetailResponse } from "./userGroup.js";

const now = new Date("2026-09-08T12:00:00.000Z");

function group(members: Array<{ userId: string; role: string }>) {
  return {
    id: "g1",
    name: "UI Review League",
    description: null,
    inviteCode: "abc123",
    inviteReferrerAddress: null,
    createdAt: now,
    updatedAt: now,
    members: members.map((m, i) => ({
      id: `m${i}`,
      userId: m.userId,
      role: m.role,
      joinedAt: now,
      user: { id: m.userId, name: `User ${m.userId}` },
    })),
    _count: { members: members.length, contests: 0 },
  };
}

describe("formatUserGroupDetailResponse referralStake", () => {
  it("attaches invite-tree depths for admins only", () => {
    const userGroup = group([
      { userId: "admin", role: "ADMIN" },
      { userId: "direct", role: "MEMBER" },
      { userId: "other", role: "MEMBER" },
    ]);
    const depths = new Map([
      ["direct", 1],
      ["other", 3],
    ]);

    const asAdmin = formatUserGroupDetailResponse(userGroup, "admin", {
      referralDepthByUserId: depths,
    });
    expect(asAdmin.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "direct", referralStake: { depth: 1 } }),
        expect.objectContaining({ userId: "other", referralStake: { depth: 3 } }),
        expect.objectContaining({ userId: "admin" }),
      ]),
    );
    expect(asAdmin.members.find((m) => m.userId === "admin")).not.toHaveProperty("referralStake");

    const asMember = formatUserGroupDetailResponse(userGroup, "direct", {
      referralDepthByUserId: depths,
    });
    expect(asMember.members.every((m) => !("referralStake" in m))).toBe(true);
  });
});
