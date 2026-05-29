import { describe, expect, it } from "vitest";
import { mergeTournament, type TournamentLive, type TournamentShell } from "./tournament";

const shell: TournamentShell = {
  id: "t1",
  pgaTourId: "R202501",
  name: "Test Open",
  startDate: "2025-05-01T00:00:00.000Z",
  endDate: "2025-05-04T00:00:00.000Z",
  beautyImage: "https://example.com/hero.jpg",
  summarySections: [{ title: "Field", items: [{ body: "Strong field." }] }],
  timezone: "America/New_York",
  manualActive: true,
  createdAt: "2025-04-01T00:00:00.000Z",
  updatedAt: "2025-04-01T00:00:00.000Z",
};

const live: TournamentLive = {
  status: "IN_PROGRESS",
  roundStatusDisplay: "In Progress",
  roundDisplay: "R2",
  currentRound: 2,
  course: "Updated Course",
  city: "Charlotte",
  state: "NC",
};

describe("mergeTournament", () => {
  it("combines shell and live with live overriding location fields", () => {
    const merged = mergeTournament(shell, live);
    expect(merged.id).toBe(shell.id);
    expect(merged.name).toBe(shell.name);
    expect(merged.beautyImage).toBe(shell.beautyImage);
    expect(merged.summarySections).toEqual(shell.summarySections);
    expect(merged.status).toBe("IN_PROGRESS");
    expect(merged.roundDisplay).toBe("R2");
    expect(merged.course).toBe("Updated Course");
    expect(merged.city).toBe("Charlotte");
  });
});
