import { describe, expect, it } from "vitest";
import { resolveNextGolfEvent } from "./resolveNextGolfEvent.js";

describe("resolveNextGolfEvent", () => {
  it("picks the soonest upcoming event with a published field", async () => {
    const pick = await resolveNextGolfEvent({
      now: new Date("2026-10-05T14:00:00.000Z"),
      currentExternalId: "R1",
      fetchSchedule: async (year) => {
        expect(year).toBe(2026);
        return [
          { id: "R1", tournamentName: "This Week", sequenceNumber: 1 },
          { id: "R2", tournamentName: "Next Week", sequenceNumber: 2 },
          { id: "R3", tournamentName: "Empty Future", sequenceNumber: 3 },
        ];
      },
      fetchTournament: async (id) => ({
        tournamentName: id === "R2" ? "Next Week" : id === "R3" ? "Empty Future" : "This Week",
        tournamentStatus: id === "R1" ? "IN_PROGRESS" : "NOT_STARTED",
        displayDate: id === "R1" ? "Oct 1 - 4, 2026" : id === "R2" ? "Oct 8 - 11, 2026" : "Oct 15 - 18, 2026",
        timezone: "America/New_York",
        seasonYear: 2026,
      }),
      fetchField: async (id) => ({ players: id === "R3" ? [] : [{ id: "p1" }, { id: "p2" }] }),
    });
    expect(pick?.id).toBe("R2");
    expect(pick?.fieldSize).toBe(2);
  });

  it("falls back to the next season when the current year schedule is empty", async () => {
    const years: number[] = [];
    const pick = await resolveNextGolfEvent({
      now: new Date("2026-12-20T14:00:00.000Z"),
      fetchSchedule: async (year) => {
        years.push(year);
        if (year === 2026) return [];
        return [{ id: "R2027", tournamentName: "Opener", sequenceNumber: 1 }];
      },
      fetchTournament: async () => ({
        tournamentName: "Opener",
        tournamentStatus: "NOT_STARTED",
        displayDate: "Jan 7 - 10, 2027",
        timezone: "America/New_York",
        seasonYear: 2027,
      }),
      fetchField: async () => ({ players: [{ id: "p1" }] }),
    });
    expect(years).toEqual([2026, 2027]);
    expect(pick?.id).toBe("R2027");
  });
});
