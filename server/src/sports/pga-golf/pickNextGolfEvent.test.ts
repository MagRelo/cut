import { describe, expect, it } from "vitest";
import { pickNextGolfEvent } from "./pickNextGolfEvent.js";

const thu = (iso: string) => new Date(iso);

describe("pickNextGolfEvent", () => {
  it("picks the soonest upcoming event with a field", () => {
    const pick = pickNextGolfEvent(
      [
        {
          id: "R1",
          tournamentName: "This Week",
          status: "IN_PROGRESS",
          startDate: thu("2026-10-01T12:00:00.000Z"),
          fieldSize: 120,
        },
        {
          id: "R2",
          tournamentName: "Next Week",
          status: "NOT_STARTED",
          startDate: thu("2026-10-08T12:00:00.000Z"),
          fieldSize: 144,
        },
        {
          id: "R3",
          tournamentName: "Later",
          status: "NOT_STARTED",
          startDate: thu("2026-10-15T12:00:00.000Z"),
          fieldSize: 132,
        },
      ],
      "R1",
    );
    expect(pick?.id).toBe("R2");
  });

  it("skips empty fields and completed events", () => {
    const pick = pickNextGolfEvent([
      {
        id: "done",
        tournamentName: "Done",
        status: "COMPLETE",
        startDate: thu("2026-10-08T12:00:00.000Z"),
        fieldSize: 144,
      },
      {
        id: "empty",
        tournamentName: "Future",
        status: "NOT_STARTED",
        startDate: thu("2026-10-08T12:00:00.000Z"),
        fieldSize: 0,
      },
      {
        id: "ready",
        tournamentName: "Ready",
        status: "NOT_STARTED",
        startDate: thu("2026-10-15T12:00:00.000Z"),
        fieldSize: 30,
      },
    ]);
    expect(pick?.id).toBe("ready");
    expect(pick?.fieldSize).toBe(30);
  });

  it("picks the larger field when two events share a start week", () => {
    const pick = pickNextGolfEvent([
      {
        id: "opp",
        tournamentName: "Opposite",
        status: "NOT_STARTED",
        startDate: thu("2026-10-08T12:00:00.000Z"),
        fieldSize: 80,
      },
      {
        id: "sig",
        tournamentName: "Signature",
        status: "NOT_STARTED",
        startDate: thu("2026-10-09T12:00:00.000Z"),
        fieldSize: 144,
      },
    ]);
    expect(pick?.id).toBe("sig");
  });

  it("returns null when nothing is eligible", () => {
    expect(
      pickNextGolfEvent([
        {
          id: "R1",
          tournamentName: "Active",
          status: "IN_PROGRESS",
          startDate: thu("2026-10-01T12:00:00.000Z"),
          fieldSize: 120,
        },
      ], "R1"),
    ).toBeNull();
  });
});
