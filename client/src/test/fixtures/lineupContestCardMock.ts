import type { ContestLineup, PlatformLineupListItem } from "../../types/lineup";
import type { PlatformLineupPick } from "../../types/event";
import type { EventStatus } from "../../types/event";

export const STORYBOOK_LINEUP_EVENT_ID = "event-storybook";
export const STORYBOOK_LINEUP_ID = "lineup-storybook-1";

const FIELD_PLAYER_DEFS = [
  { id: "ep-scheffler", participantId: "p-scheffler", firstName: "Scottie", lastName: "Scheffler" },
  { id: "ep-mcilroy", participantId: "p-mcilroy", firstName: "Rory", lastName: "McIlroy" },
  { id: "ep-rahm", participantId: "p-rahm", firstName: "Jon", lastName: "Rahm" },
  { id: "ep-schauffele", participantId: "p-schauffele", firstName: "Xander", lastName: "Schauffele" },
  { id: "ep-dechambeau", participantId: "p-dechambeau", firstName: "Bryson", lastName: "DeChambeau" },
  { id: "ep-hovland", participantId: "p-hovland", firstName: "Viktor", lastName: "Hovland" },
  { id: "ep-morikawa", participantId: "p-morikawa", firstName: "Collin", lastName: "Morikawa" },
  { id: "ep-clark", participantId: "p-clark", firstName: "Wyndham", lastName: "Clark" },
  { id: "ep-burns", participantId: "p-burns", firstName: "Sam", lastName: "Burns" },
  { id: "ep-thomas", participantId: "p-thomas", firstName: "Justin", lastName: "Thomas" },
  { id: "ep-spieth", participantId: "p-spieth", firstName: "Jordan", lastName: "Spieth" },
  { id: "ep-rose", participantId: "p-rose", firstName: "Justin", lastName: "Rose" },
] as const;

function buildPick(
  def: (typeof FIELD_PLAYER_DEFS)[number],
  slotIndex: number,
  total = 0,
): PlatformLineupPick {
  return {
    id: `pick-${def.id}`,
    slotIndex,
    eventParticipantId: def.id,
    participant: {
      id: def.participantId,
      displayName: `${def.firstName} ${def.lastName}`,
      externalId: def.participantId,
      metadata: null,
    },
    scoreData: { total, leaderboardTotal: total === 0 ? "E" : String(total) },
    total,
  };
}

function picksForEventParticipantIds(eventParticipantIds: string[]): PlatformLineupPick[] {
  return eventParticipantIds
    .map((id, index) => {
      const def = FIELD_PLAYER_DEFS.find((entry) => entry.id === id);
      return def ? buildPick(def, index) : null;
    })
    .filter((pick): pick is PlatformLineupPick => pick !== null);
}

export function buildLineupPicksByEventParticipantIds(
  eventParticipantIds: string[],
): PlatformLineupPick[] {
  return picksForEventParticipantIds(eventParticipantIds);
}

const storybookUser = {
  id: "user-storybook",
  name: "Storybook User",
  email: "storybook@example.com",
  userType: "USER" as const,
  isVerified: true,
  loginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: { color: "#3B82F6" },
};

function buildPlatformLineup(eventParticipantIds: string[] = []): PlatformLineupListItem {
  const picks = picksForEventParticipantIds(eventParticipantIds);
  const now = new Date().toISOString();
  const score = picks.reduce((sum, pick) => sum + (pick.total ?? 0), 0);
  return {
    id: STORYBOOK_LINEUP_ID,
    eventId: STORYBOOK_LINEUP_EVENT_ID,
    name: "Lineup #1",
    prediction: { winningScorePrediction: 150 },
    picks,
    score,
    createdAt: now,
    updatedAt: now,
    contestLineups: [],
  };
}

export function buildContestLineupForCard(eventParticipantIds: string[] = []): ContestLineup {
  const platformLineup = buildPlatformLineup(eventParticipantIds);
  const score = platformLineup.picks.reduce((sum, pick) => sum + (pick.total ?? 0), 0);

  return {
    id: "contest-lineup-storybook",
    contestId: "",
    status: "ACTIVE",
    position: 0,
    score,
    lineupId: STORYBOOK_LINEUP_ID,
    lineup: platformLineup,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: storybookUser.id,
    user: storybookUser,
  };
}

export function createStorybookLineupsList(
  eventParticipantIds: string[] = [],
): PlatformLineupListItem[] {
  return [buildPlatformLineup(eventParticipantIds)];
}

export const lineupContestCardStoryDefaults = {
  sportId: "golf",
  eventId: STORYBOOK_LINEUP_EVENT_ID,
  eventStatus: "SCHEDULED" as EventStatus,
  isEventEditable: true,
  isEditable: true,
};
