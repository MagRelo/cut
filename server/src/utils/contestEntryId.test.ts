import { describe, expect, it } from "vitest";
import { generateContestEntryId } from "./contestEntryId.js";

const CONTEST = "0x1234567890abcdef1234567890abcdef12345678";
const LINEUP_ID = "cm1a2b3c4d5e6f7g8h9i0j1k";

describe("generateContestEntryId", () => {
  it("is deterministic for the same contest and lineup", () => {
    expect(generateContestEntryId(CONTEST, LINEUP_ID)).toBe(
      generateContestEntryId(CONTEST, LINEUP_ID),
    );
  });

  it("changes when the lineup id changes", () => {
    expect(generateContestEntryId(CONTEST, LINEUP_ID)).not.toBe(
      generateContestEntryId(CONTEST, "cmclone000000000000000001"),
    );
  });
});
