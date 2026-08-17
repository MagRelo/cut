import { prisma } from "./prisma.js";
import { BRAND_PROSE } from "./brand.js";
import { resolveContestDbId } from "../utils/contestRouteParam.js";

export type PageMetadata = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "website";
};

const DEFAULT_OG_IMAGE = "https://playthecut.com/cut-logo2-og.png";
const DEFAULT_DESCRIPTION = "Create your team, join a league, and compete with other players.";
const TITLE_SUFFIX = ` | ${BRAND_PROSE}`;

const EVENT_LEADERBOARD_PATH =
  /^\/sports\/([^/]+)\/events\/([^/]+)\/leaderboard$/;
const SPORT_LEADERBOARD_PATH = /^\/sports\/([^/]+)\/leaderboard$/;

function defaultMetadata(requestUrl: URL, baseUrl: string): PageMetadata {
  return {
    title: BRAND_PROSE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_OG_IMAGE,
    url: `${baseUrl}${requestUrl.pathname}${requestUrl.search}`,
    type: "website",
  };
}

function getContestEntryLabel(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") {
    return null;
  }

  const primaryDeposit = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  if (primaryDeposit == null) {
    return null;
  }

  const entryFee = Number(primaryDeposit);
  if (!Number.isFinite(entryFee)) {
    return null;
  }

  if (entryFee === 0) {
    return "Free";
  }

  return `$${entryFee}`;
}

function eventNameFromMetadata(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const name = (metadata as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }
  return fallback;
}

function participantDisplayName(participant: {
  displayName: string | null;
  metadata: unknown;
}): string | null {
  if (participant.displayName?.trim()) {
    return participant.displayName.trim();
  }
  if (
    participant.metadata &&
    typeof participant.metadata === "object" &&
    !Array.isArray(participant.metadata)
  ) {
    const meta = participant.metadata as { displayName?: unknown; shortName?: unknown };
    if (typeof meta.displayName === "string" && meta.displayName.trim()) {
      return meta.displayName.trim();
    }
    if (typeof meta.shortName === "string" && meta.shortName.trim()) {
      return meta.shortName.trim();
    }
  }
  return null;
}

type LeaderboardEvent = {
  id: string;
  sportId: string;
  metadata: unknown;
  externalId: string;
};

async function loadLeaderboardEvent(requestUrl: URL): Promise<LeaderboardEvent | null> {
  const path = requestUrl.pathname;
  const eventScoped = path.match(EVENT_LEADERBOARD_PATH);
  const sportScoped = path.match(SPORT_LEADERBOARD_PATH);
  const sportId = eventScoped?.[1] ?? sportScoped?.[1];
  const routeEventId = eventScoped?.[2];
  if (!sportId) {
    return null;
  }

  const event = routeEventId
    ? await prisma.competitionEvent.findUnique({
        where: { id: routeEventId },
        select: { id: true, sportId: true, metadata: true, externalId: true },
      })
    : await prisma.competitionEvent.findFirst({
        where: { sportId, isActive: true },
        select: { id: true, sportId: true, metadata: true, externalId: true },
      });

  if (!event || event.sportId !== sportId) {
    return null;
  }
  return event;
}

async function resolveLeaderboardMetadata(
  requestUrl: URL,
  defaults: PageMetadata,
): Promise<PageMetadata | null> {
  const event = await loadLeaderboardEvent(requestUrl);
  if (!event) {
    return null;
  }

  const tournamentName = eventNameFromMetadata(event.metadata, event.externalId);
  if (!tournamentName) {
    return null;
  }

  const playerId = requestUrl.searchParams.get("playerId")?.trim();
  if (playerId) {
    const row = await prisma.eventParticipant.findUnique({
      where: {
        eventId_participantId: { eventId: event.id, participantId: playerId },
      },
      select: {
        participant: { select: { displayName: true, metadata: true } },
      },
    });
    const playerName = row ? participantDisplayName(row.participant) : null;
    if (playerName) {
      return {
        ...defaults,
        title: `${playerName} | ${tournamentName}`,
        description: `${playerName} at ${tournamentName} on ${BRAND_PROSE}.`,
      };
    }
  }

  return {
    ...defaults,
    title: `${tournamentName}${TITLE_SUFFIX}`,
    description: `${tournamentName} field on ${BRAND_PROSE}.`,
  };
}

async function resolveContestMetadata(
  requestUrl: URL,
  defaults: PageMetadata,
): Promise<PageMetadata | null> {
  const contestMatch = requestUrl.pathname.match(/^\/contest\/([^/]+)$/);
  const routeParam = contestMatch?.[1];
  if (!routeParam) {
    return null;
  }

  const contestId = await resolveContestDbId(routeParam);
  if (!contestId) {
    return null;
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      name: true,
      description: true,
      settings: true,
    },
  });
  if (!contest?.name) {
    return null;
  }

  const entryLabel = getContestEntryLabel(contest.settings);
  const titleParts = [entryLabel, contest.name].filter(Boolean).join(" ").trim();

  return {
    ...defaults,
    title: `${titleParts}${TITLE_SUFFIX}`,
    description: contest.description?.trim() || `Join this contest on ${BRAND_PROSE}.`,
  };
}

export async function resolvePageMetadata(
  requestUrl: URL,
  baseUrl: string,
): Promise<PageMetadata> {
  const defaults = defaultMetadata(requestUrl, baseUrl);

  try {
    const leaderboardMeta = await resolveLeaderboardMetadata(requestUrl, defaults);
    if (leaderboardMeta) {
      return leaderboardMeta;
    }
  } catch (error) {
    console.error("Error resolving leaderboard metadata:", error);
  }

  try {
    const contestMeta = await resolveContestMetadata(requestUrl, defaults);
    if (contestMeta) {
      return contestMeta;
    }
  } catch (error) {
    console.error("Error resolving contest metadata:", error);
  }

  return defaults;
}
