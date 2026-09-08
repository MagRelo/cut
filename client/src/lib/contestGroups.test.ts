import { describe, expect, it } from "vitest";
import type {
  ContestDirectoryEvent,
  ContestDirectoryResponse,
  EventContestGroup,
  LeagueContest,
} from "../types/contest";
import {
  findDirectoryEvent,
  leagueCreateContestPath,
  overlayLeagueContestsOnDirectory,
} from "./contestGroups";

function directoryEvent(
  id: string,
  overrides: Partial<ContestDirectoryEvent> = {},
): ContestDirectoryEvent {
  return {
    id,
    sportId: "pga-golf",
    sportName: "PGA Tour Fantasy",
    externalId: `ext-${id}`,
    name: `Event ${id}`,
    startDate: "2026-04-09",
    endDate: "2026-04-12",
    isActive: true,
    metadata: { name: `Event ${id}`, status: "scheduled" },
    ...overrides,
  };
}

function group(event: ContestDirectoryEvent, contestIds: string[] = []): EventContestGroup {
  return {
    event,
    contests: contestIds.map((id) => ({ id, eventId: event.id }) as LeagueContest),
  };
}

function leagueContest(id: string, event: ContestDirectoryEvent): LeagueContest {
  return {
    id,
    eventId: event.id,
    event: {
      id: event.id,
      sportId: event.sportId,
      externalId: event.externalId,
      isActive: event.isActive,
      metadata: event.metadata,
      createdAt: "",
      updatedAt: "",
    },
    eventSummary: event,
  } as LeagueContest;
}

describe("overlayLeagueContestsOnDirectory", () => {
  const upcomingEvent = directoryEvent("upcoming-1");
  const liveEvent = directoryEvent("live-1", {
    metadata: { name: "Live Event", status: "inprogress" },
  });
  const directory: ContestDirectoryResponse = {
    upcoming: [group(upcomingEvent)],
    live: [group(liveEvent, ["public-live"])],
    past: [],
  };

  it("keeps empty upcoming events so a create slot can show", () => {
    const result = overlayLeagueContestsOnDirectory(directory, []);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.contests).toEqual([]);
    expect(result.live).toEqual([]);
  });

  it("overlays league contests onto matching directory events", () => {
    const league = [leagueContest("league-1", upcomingEvent)];
    const result = overlayLeagueContestsOnDirectory(directory, league);
    expect(result.upcoming[0]?.contests.map((contest) => contest.id)).toEqual(["league-1"]);
  });
});

describe("findDirectoryEvent", () => {
  it("finds an event across directory sections", () => {
    const event = directoryEvent("evt-9");
    const directory: ContestDirectoryResponse = {
      upcoming: [group(event)],
      live: [],
      past: [],
    };
    expect(findDirectoryEvent(directory, "evt-9")?.id).toBe("evt-9");
    expect(findDirectoryEvent(directory, "missing")).toBeNull();
  });
});

describe("leagueCreateContestPath", () => {
  it("includes the event id as a query param", () => {
    expect(leagueCreateContestPath("league-1", "event-2")).toBe(
      "/leagues/league-1/contests/create?eventId=event-2",
    );
  });
});
