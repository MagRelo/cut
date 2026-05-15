import { describe, expect, it } from "vitest";

/** Mirrors client `getRoundNumberFromDisplay` / `getTeeTimeLabelForRound` for unit coverage. */
function getRoundNumberFromDisplay(roundDisplay: string): number {
  const normalized = (roundDisplay || "r1").trim().toLowerCase();
  const m = /^r([1-4])$/.exec(normalized);
  return m ? Number(m[1]) : 1;
}

function getTeeTimeLabelForRound(
  teeTimes: { roundNum: number; label: string }[] | undefined,
  roundDisplay: string,
): string | null {
  if (!teeTimes?.length) return null;
  const roundNum = getRoundNumberFromDisplay(roundDisplay);
  return teeTimes.find((t) => t.roundNum === roundNum)?.label ?? null;
}

describe("tee time display (client parity)", () => {
  it("getRoundNumberFromDisplay parses R2", () => {
    expect(getRoundNumberFromDisplay("R2")).toBe(2);
  });

  it("getTeeTimeLabelForRound returns label for matching round", () => {
    expect(
      getTeeTimeLabelForRound(
        [
          { roundNum: 1, label: "8:18 AM" },
          { roundNum: 2, label: "1:43 PM" },
        ],
        "r2",
      ),
    ).toBe("1:43 PM");
  });
});
