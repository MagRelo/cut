import type { Candidate } from "@cut/sport-sdk";
import type { ActiveEventResponse, PlatformLineup } from "../types/event";
import {
  DEFAULT_TOURNAMENT_BEAUTY_IMAGE,
  TournamentStatus,
  type Tournament,
  type TournamentLive,
  type TournamentShell,
} from "../types/tournament";
import type { PlayerWithTournamentData, TournamentLineup } from "../types/player";
import type { TournamentLineupListItem } from "../types/lineup";
import { golfPredictionValue } from "./golfPrediction";

type GolfEventMetadata = {
  name?: string;
  pgaTourId?: string;
  startDate?: string;
  endDate?: string;
  course?: string;
  city?: string;
  state?: string;
  timezone?: string;
  status?: string;
  roundStatusDisplay?: string | null;
  roundDisplay?: string | null;
  currentRound?: number | null;
  weather?: Record<string, unknown>;
  beautyImage?: string | null;
  cutLine?: string | null;
  cutRound?: string | null;
  summarySections?: unknown;
  purse?: number | null;
};

function mapGolfStatus(status: string | undefined): (typeof TournamentStatus)[keyof typeof TournamentStatus] {
  switch (status?.toUpperCase()) {
    case "IN_PROGRESS":
      return TournamentStatus.IN_PROGRESS;
    case "COMPLETE":
    case "OFFICIAL":
      return TournamentStatus.COMPLETED;
    case "CANCELLED":
      return TournamentStatus.CANCELLED;
    default:
      return TournamentStatus.NOT_STARTED;
  }
}

export function golfEventToTournamentShell(
  active: ActiveEventResponse,
): TournamentShell {
  const meta = (active.event.metadata ?? {}) as GolfEventMetadata;
  return {
    id: active.event.id,
    pgaTourId: meta.pgaTourId ?? active.event.externalId,
    name: meta.name ?? "Event",
    startDate: meta.startDate ?? active.event.createdAt,
    endDate: meta.endDate ?? active.event.createdAt,
    beautyImage: meta.beautyImage ?? DEFAULT_TOURNAMENT_BEAUTY_IMAGE,
    summarySections: meta.summarySections as TournamentShell["summarySections"],
    timezone: meta.timezone ?? "America/New_York",
    manualActive: active.event.isActive,
    createdAt: active.event.createdAt,
    updatedAt: active.event.updatedAt,
  };
}

export function golfEventToTournamentLive(active: ActiveEventResponse): TournamentLive {
  const meta = (active.event.metadata ?? {}) as GolfEventMetadata;
  return {
    status: mapGolfStatus(meta.status),
    roundStatusDisplay: meta.roundStatusDisplay ?? null,
    roundDisplay: meta.roundDisplay ?? null,
    currentRound: meta.currentRound ?? null,
    weather: meta.weather,
    course: meta.course ?? "",
    city: meta.city ?? "",
    state: meta.state ?? "",
  };
}

export function golfEventToTournament(active: ActiveEventResponse): Tournament {
  const shell = golfEventToTournamentShell(active);
  const live = golfEventToTournamentLive(active);
  const meta = (active.event.metadata ?? {}) as GolfEventMetadata;
  return {
    ...shell,
    status: live.status,
    roundStatusDisplay: live.roundStatusDisplay ?? undefined,
    roundDisplay: live.roundDisplay ?? undefined,
    currentRound: live.currentRound ?? undefined,
    weather: live.weather,
    course: live.course,
    city: live.city,
    state: live.state,
    cutLine: meta.cutLine ?? undefined,
    cutRound: meta.cutRound ?? undefined,
    purse: meta.purse ?? undefined,
    createdAt: new Date(shell.createdAt),
    updatedAt: new Date(shell.updatedAt),
  };
}

export function candidateToPlayer(
  candidate: Candidate,
  eventId: string,
): PlayerWithTournamentData {
  const meta = (candidate.metadata ?? {}) as {
    participant?: Record<string, unknown>;
    scoreData?: Record<string, unknown>;
    total?: number;
  };
  const participant = meta.participant ?? {};
  const scoreData = meta.scoreData ?? {};

  return {
    id: candidate.participantId,
    pga_pgaTourId: typeof participant.pgaTourId === "string" ? participant.pgaTourId : undefined,
    pga_imageUrl: typeof participant.imageUrl === "string" ? participant.imageUrl : undefined,
    pga_displayName: candidate.displayName,
    pga_firstName: typeof participant.firstName === "string" ? participant.firstName : undefined,
    pga_lastName: typeof participant.lastName === "string" ? participant.lastName : undefined,
    pga_shortName: typeof participant.shortName === "string" ? participant.shortName : undefined,
    pga_country: typeof participant.country === "string" ? participant.country : undefined,
    pga_countryFlag:
      typeof participant.countryFlag === "string" ? participant.countryFlag : undefined,
    pga_age: typeof participant.age === "number" ? participant.age : undefined,
    pga_owgr: typeof participant.owgr === "string" ? Number(participant.owgr) : undefined,
    pga_fedex: typeof participant.fedex === "string" ? Number(participant.fedex) : undefined,
    isActive: participant.isActive !== false,
    inField: participant.inField !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tournamentId: eventId,
    tournamentData: {
      leaderboardPosition:
        typeof scoreData.leaderboardPosition === "string"
          ? scoreData.leaderboardPosition
          : undefined,
      total: typeof meta.total === "number" ? meta.total : 0,
      leaderboardTotal:
        typeof scoreData.leaderboardTotal === "string" ? scoreData.leaderboardTotal : undefined,
      cut: typeof scoreData.cut === "number" ? scoreData.cut : undefined,
      bonus: typeof scoreData.bonus === "number" ? scoreData.bonus : undefined,
      r1: scoreData.r1 as PlayerWithTournamentData["tournamentData"]["r1"],
      r2: scoreData.r2 as PlayerWithTournamentData["tournamentData"]["r2"],
      r3: scoreData.r3 as PlayerWithTournamentData["tournamentData"]["r3"],
      r4: scoreData.r4 as PlayerWithTournamentData["tournamentData"]["r4"],
      teeTimes: Array.isArray(scoreData.teeTimes)
        ? (scoreData.teeTimes as PlayerWithTournamentData["tournamentData"]["teeTimes"])
        : undefined,
    },
  };
}

export function platformLineupToTournamentLineup(
  lineup: PlatformLineup,
  playersByParticipantId: Map<string, PlayerWithTournamentData>,
): TournamentLineup {
  const players = lineup.picks
    .map((pick) => {
      const participantId = pick.participant?.id;
      if (!participantId) return null;
      return playersByParticipantId.get(participantId) ?? null;
    })
    .filter((player): player is PlayerWithTournamentData => player !== null);

  return {
    id: lineup.id,
    name: lineup.name,
    players,
    winningScorePrediction: golfPredictionValue(lineup.prediction),
  };
}

export function platformLineupToListItem(
  lineup: PlatformLineup,
  playersByParticipantId: Map<string, PlayerWithTournamentData>,
): TournamentLineupListItem {
  return {
    ...platformLineupToTournamentLineup(lineup, playersByParticipantId),
    contestLineups: lineup.contestLineups ?? [],
  };
}
