import { describe, expect, it } from "vitest";
import type { Candidate } from "@cut/sport-sdk";
import { shouldReuseHydratedSlots } from "./useLineupSlotEditor";

function candidate(eventParticipantId: string): Candidate {
  return {
    eventParticipantId,
    participantId: eventParticipantId,
    displayName: eventParticipantId,
    sortKeys: {},
    metadata: null,
  };
}

describe("shouldReuseHydratedSlots", () => {
  it("keeps empty slots when the pick key and slot count already match", () => {
    const prev = [null, null, null, null];
    expect(shouldReuseHydratedSlots(prev, "", 4)).toBe(true);
  });

  it("rehydrates when slot count changes even if picks are unchanged", () => {
    const prev = [null, null, null, null];
    expect(shouldReuseHydratedSlots(prev, "", 3)).toBe(false);
  });

  it("rehydrates when pick ids change at the same slot count", () => {
    const prev = [candidate("a"), null, null];
    expect(shouldReuseHydratedSlots(prev, "a", 3)).toBe(true);
    expect(shouldReuseHydratedSlots(prev, "b", 3)).toBe(false);
  });
});
