import { describe, expect, it } from "vitest";
import {
  buildPgaTourIdToTeeTimesMap,
  buildStoredTeeTimes,
  formatDataGolfTeeTimeLabel,
} from "./dataGolfFieldUpdates.js";

describe("formatDataGolfTeeTimeLabel", () => {
  it("formats afternoon tee time in America/New_York", () => {
    const label = formatDataGolfTeeTimeLabel("2026-05-15 13:43", "America/New_York");
    expect(label).toBe("1:43 PM");
  });

  it("returns null for invalid teetime", () => {
    expect(formatDataGolfTeeTimeLabel("not-a-date", "America/New_York")).toBeNull();
  });
});

describe("buildStoredTeeTimes", () => {
  it("produces sorted round entries with label and iso", () => {
    const stored = buildStoredTeeTimes(
      [
        { round_num: 2, teetime: "2026-05-15 13:43" },
        { round_num: 1, teetime: "2026-05-14 08:18" },
      ],
      "America/New_York",
    );
    expect(stored).toHaveLength(2);
    const r1 = stored[0]!;
    const r2 = stored[1]!;
    expect(r1.roundNum).toBe(1);
    expect(r1.label).toBe("8:18 AM");
    expect(r2.roundNum).toBe(2);
    expect(r2.label).toBe("1:43 PM");
    expect(r1.teetimeIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("buildPgaTourIdToTeeTimesMap", () => {
  it("keys by player_num string", () => {
    const map = buildPgaTourIdToTeeTimesMap([
      {
        dg_id: 1,
        player_num: 52955,
        player_name: "Test",
        teetimes: [{ round_num: 1, teetime: "2026-05-14 08:18" }],
      },
    ]);
    const times = map.get("52955");
    expect(times).toHaveLength(1);
    expect(times![0]!.round_num).toBe(1);
  });
});
