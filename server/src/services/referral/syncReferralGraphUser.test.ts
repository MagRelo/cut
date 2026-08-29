import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));

import {
  inviteeMustNotUsePlatformRoot,
  REFUSE_INVITEE_UNDER_PLATFORM_ROOT,
} from "./syncReferralGraphUser.js";

const PLATFORM_ROOT = "0xbe18962d9c9da9681b6ef29df03055a3f329f352" as `0x${string}`;
const INVITER = "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e" as `0x${string}`;

describe("inviteeMustNotUsePlatformRoot", () => {
  it("refuses an invitee whose resolved parent is the platform root", () => {
    expect(
      inviteeMustNotUsePlatformRoot(
        { kind: "invited", parent: PLATFORM_ROOT, inviterUserId: "alice" },
        PLATFORM_ROOT,
      ),
    ).toBe(true);
    expect(REFUSE_INVITEE_UNDER_PLATFORM_ROOT).toMatch(/platform root/);
  });

  it("allows an invitee under a distinct inviter wallet", () => {
    expect(
      inviteeMustNotUsePlatformRoot(
        { kind: "invited", parent: INVITER, inviterUserId: "alice" },
        PLATFORM_ROOT,
      ),
    ).toBe(false);
  });

  it("does not apply to organics (they belong under the platform root)", () => {
    expect(
      inviteeMustNotUsePlatformRoot({ kind: "organic", parent: PLATFORM_ROOT }, PLATFORM_ROOT),
    ).toBe(false);
  });
});
