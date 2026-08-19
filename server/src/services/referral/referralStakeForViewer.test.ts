import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, queryRaw } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique },
    $queryRaw: queryRaw,
  },
}));

import {
  MAX_REFERRAL_STAKE_DEPTH,
  attachReferralStakes,
  contestReferralNetworkBps,
  referralStakeForViewer,
  referralStakeForViewerByPrivyId,
} from "./referralStakeForViewer.js";

const VIEWER = "viewer-1";
const GROUP = "0x" + "ab".repeat(32);

function viewerWithInvitee(
  overrides: {
    referralChainId?: number | null;
    referralGroupId?: string | null;
    referredUsers?: Array<{ referralChainId: number | null; referralGroupId: string | null }>;
  } = {},
) {
  return {
    id: VIEWER,
    referralChainId: "referralChainId" in overrides ? overrides.referralChainId : 84532,
    referralGroupId: "referralGroupId" in overrides ? overrides.referralGroupId : GROUP,
    referredUsers:
      overrides.referredUsers ??
      [{ referralChainId: 84532, referralGroupId: GROUP }],
  };
}

describe("contestReferralNetworkBps", () => {
  it("reads referralNetworkBps then oracleFeeBps", () => {
    expect(contestReferralNetworkBps({ referralNetworkBps: 500 })).toBe(500);
    expect(contestReferralNetworkBps({ oracleFeeBps: 700 })).toBe(700);
    expect(contestReferralNetworkBps({ referralNetworkBps: 0, oracleFeeBps: 700 })).toBe(0);
    expect(contestReferralNetworkBps({})).toBe(0);
    expect(contestReferralNetworkBps(null)).toBe(0);
  });
});

describe("attachReferralStakes", () => {
  it("omits the field when there is no stake", () => {
    const lineups = [{ userId: "a" }, { userId: "b" }];
    expect(attachReferralStakes(lineups, new Map())).toEqual(lineups);
    expect(attachReferralStakes(lineups, new Map([["a", 1]]))).toEqual([
      { userId: "a", referralStake: { depth: 1 } },
      { userId: "b" },
    ]);
  });
});

describe("referralStakeForViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the database when there are no other contestants", async () => {
    await expect(referralStakeForViewer(VIEWER, [])).resolves.toEqual(new Map());
    await expect(referralStakeForViewer(VIEWER, [VIEWER, VIEWER])).resolves.toEqual(new Map());
    expect(findUnique).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("skips the CTE when the viewer has no invitees", async () => {
    findUnique.mockResolvedValue(viewerWithInvitee({ referredUsers: [] }));

    const result = await referralStakeForViewer(VIEWER, ["contestant-1"]);

    expect(result.size).toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("skips the CTE when chain/group cannot be inferred", async () => {
    findUnique.mockResolvedValue(
      viewerWithInvitee({
        referralChainId: null,
        referralGroupId: null,
        referredUsers: [{ referralChainId: null, referralGroupId: null }],
      }),
    );

    const result = await referralStakeForViewer(VIEWER, ["contestant-1"]);

    expect(result.size).toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("maps CTE depths for direct and nested invitees and ignores out-of-range rows", async () => {
    findUnique.mockResolvedValue(viewerWithInvitee());
    queryRaw.mockResolvedValue([
      { leaf_id: "direct", depth: 1 },
      { leaf_id: "nested", depth: 3 },
      { leaf_id: "too-deep", depth: MAX_REFERRAL_STAKE_DEPTH + 1 },
      { leaf_id: "self", depth: 0 },
    ]);

    const result = await referralStakeForViewer(VIEWER, ["direct", "nested", "organic"]);

    expect(result).toEqual(
      new Map([
        ["direct", 1],
        ["nested", 3],
      ]),
    );
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("dedupes contestant ids and excludes the viewer before the CTE", async () => {
    findUnique.mockResolvedValue(viewerWithInvitee());
    queryRaw.mockResolvedValue([{ leaf_id: "direct", depth: 1 }]);

    await referralStakeForViewer(VIEWER, [VIEWER, "direct", "direct"]);

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe("referralStakeForViewerByPrivyId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when no Cut user exists for the Privy id", async () => {
    findUnique.mockResolvedValue(null);

    const result = await referralStakeForViewerByPrivyId("did:privy:missing", ["c1"]);

    expect(result.size).toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("runs the CTE for a provisioned viewer with invitees", async () => {
    findUnique.mockResolvedValue(viewerWithInvitee());
    queryRaw.mockResolvedValue([{ leaf_id: "direct", depth: 1 }]);

    const result = await referralStakeForViewerByPrivyId("did:privy:1", ["direct", VIEWER]);

    expect(result).toEqual(new Map([["direct", 1]]));
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { privyUserId: "did:privy:1" },
      }),
    );
  });
});
