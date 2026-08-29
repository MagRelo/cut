import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findFirst } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique, findFirst },
  },
}));

import {
  isOrganicReferralUser,
  resolveExpectedReferralParent,
} from "./resolveReferralParent.js";

const PLATFORM_ROOT = "0xbe18962d9c9da9681b6ef29df03055a3f329f352" as const;

describe("resolveReferralParent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects organics", () => {
    expect(isOrganicReferralUser({ referredByUserId: null, referrerAddress: null })).toBe(true);
    expect(
      isOrganicReferralUser({
        referredByUserId: "x",
        referrerAddress: null,
      }),
    ).toBe(false);
  });

  it("resolves organic to platform root", async () => {
    const result = await resolveExpectedReferralParent(
      {
        id: "u1",
        referredByUserId: null,
        referrerAddress: null,
        wallets: [],
      },
      84532,
      PLATFORM_ROOT,
    );
    expect(result).toEqual({ kind: "organic", parent: PLATFORM_ROOT });
  });

  it("resolves invitee via referredByUserId primary wallet", async () => {
    findUnique.mockResolvedValue({
      id: "inviter",
      wallets: [
        { publicKey: "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e", chainId: 84532, isPrimary: true },
      ],
    });

    const result = await resolveExpectedReferralParent(
      {
        id: "invitee",
        referredByUserId: "inviter",
        referrerAddress: "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e",
        wallets: [],
      },
      84532,
      PLATFORM_ROOT,
    );

    expect(result).toEqual({
      kind: "invited",
      parent: "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e",
      inviterUserId: "inviter",
    });
  });

  it("uses inviter primary even when referrerAddress disagrees", async () => {
    findUnique.mockResolvedValue({
      id: "inviter",
      wallets: [
        { publicKey: "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e", chainId: 84532, isPrimary: true },
      ],
    });

    const result = await resolveExpectedReferralParent(
      {
        id: "invitee",
        referredByUserId: "inviter",
        referrerAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        wallets: [],
      },
      84532,
      PLATFORM_ROOT,
    );

    expect(result).toEqual({
      kind: "invited",
      parent: "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e",
      inviterUserId: "inviter",
    });
  });
});
