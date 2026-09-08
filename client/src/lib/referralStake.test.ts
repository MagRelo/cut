import { describe, expect, it } from "vitest";
import { inviteNetworkLabel, referralStakeLabel } from "./referralStake";

describe("inviteNetworkLabel", () => {
  it("names a direct invite vs nested network depth", () => {
    expect(inviteNetworkLabel(1)).toBe("You invited this player.");
    expect(inviteNetworkLabel(3)).toBe("In your invite network (level 3).");
  });
});

describe("referralStakeLabel", () => {
  it("explains a direct invite vs nested network depth", () => {
    expect(referralStakeLabel(1)).toBe(
      "You invited this player. If this lineup wins, you earn a referral bonus.",
    );
    expect(referralStakeLabel(3)).toBe(
      "In your invite network (level 3). If this lineup wins, you earn a referral bonus.",
    );
  });
});
