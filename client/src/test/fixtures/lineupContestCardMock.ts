import type { ContestLineup } from "../../types/lineup";
import type { TournamentLineupListItem } from "../../types/lineup";
import type { PlayerWithTournamentData } from "../../types/player";
import type { TournamentLive, TournamentShell } from "../../types/tournament";
import { contestFixtures } from "./contestLobby";

export const STORYBOOK_LINEUP_TOURNAMENT_ID = "tournament-storybook";
export const STORYBOOK_LINEUP_ID = "tl-storybook-lineup-1";

const FIELD_PLAYER_DEFS = [
  { id: "p-scheffler", firstName: "Scottie", lastName: "Scheffler", owgr: 1, dgRank: 1 },
  { id: "p-mcilroy", firstName: "Rory", lastName: "McIlroy", owgr: 2, dgRank: 2 },
  { id: "p-rahm", firstName: "Jon", lastName: "Rahm", owgr: 3, dgRank: 3 },
  { id: "p-schauffele", firstName: "Xander", lastName: "Schauffele", owgr: 4, dgRank: 4 },
  { id: "p-dechambeau", firstName: "Bryson", lastName: "DeChambeau", owgr: 5, dgRank: 5 },
  { id: "p-hovland", firstName: "Viktor", lastName: "Hovland", owgr: 6, dgRank: 6 },
  { id: "p-morikawa", firstName: "Collin", lastName: "Morikawa", owgr: 7, dgRank: 7 },
  { id: "p-clark", firstName: "Wyndham", lastName: "Clark", owgr: 8, dgRank: 8 },
  { id: "p-burns", firstName: "Sam", lastName: "Burns", owgr: 9, dgRank: 9 },
  { id: "p-thomas", firstName: "Justin", lastName: "Thomas", owgr: 10, dgRank: 10 },
  { id: "p-spieth", firstName: "Jordan", lastName: "Spieth", owgr: 11, dgRank: 11 },
  { id: "p-rose", firstName: "Justin", lastName: "Rose", owgr: 12, dgRank: 12 },
] as const;

function buildFieldPlayer(
  def: (typeof FIELD_PLAYER_DEFS)[number],
  total = 0,
): PlayerWithTournamentData {
  const now = new Date();
  return {
    id: def.id,
    pga_displayName: `${def.firstName} ${def.lastName}`,
    pga_firstName: def.firstName,
    pga_lastName: def.lastName,
    pga_shortName: `${def.firstName[0]}. ${def.lastName}`,
    pga_country: "USA",
    pga_owgr: def.owgr,
    pga_fedex: def.owgr,
    pga_performance: {
      standings: {
        id: "fedex",
        logo: "",
        logoDark: "",
        title: "FedExCup",
        description: "",
        total: String(def.owgr),
        totalLabel: "Rank",
        rank: String(def.owgr),
        rankLogo: null,
        rankLogoDark: null,
        owgr: String(def.owgr),
        webview: null,
        webviewBrowserControls: null,
        detailCopy: null,
      },
      performance: [],
      dataGolfRanking: { dg_rank: def.dgRank },
    },
    isActive: true,
    inField: true,
    createdAt: now,
    updatedAt: now,
    tournamentId: STORYBOOK_LINEUP_TOURNAMENT_ID,
    tournamentData: {
      total,
      leaderboardTotal: total === 0 ? "E" : String(total),
    },
  };
}

export function buildLineupFieldPlayers(): PlayerWithTournamentData[] {
  return FIELD_PLAYER_DEFS.map((def) => buildFieldPlayer(def));
}

export function buildLineupPlayersByIds(playerIds: string[]): PlayerWithTournamentData[] {
  const field = buildLineupFieldPlayers();
  return playerIds
    .map((id) => field.find((player) => player.id === id))
    .filter((player): player is PlayerWithTournamentData => player !== undefined);
}

export function buildStorybookTournamentShell(): TournamentShell {
  return {
    id: STORYBOOK_LINEUP_TOURNAMENT_ID,
    pgaTourId: "R2026001",
    name: "Storybook Open",
    startDate: new Date(Date.now() + 86400 * 1000).toISOString(),
    endDate: new Date(Date.now() + 86400 * 1000 * 4).toISOString(),
    beautyImage: null,
    timezone: "America/New_York",
    manualActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildStorybookTournamentLive(): TournamentLive {
  return {
    status: "NOT_STARTED",
    roundStatusDisplay: "Not Started",
    roundDisplay: "R1",
    currentRound: 1,
    course: "Storybook CC",
    city: "Charlotte",
    state: "NC",
  };
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

export function buildContestLineupForCard(playerIds: string[] = []): ContestLineup {
  const players = buildLineupPlayersByIds(playerIds);

  return {
    id: "contest-lineup-storybook",
    contestId: "",
    status: "ACTIVE",
    position: 0,
    score: players.reduce((sum, player) => sum + (player.tournamentData.total ?? 0), 0),
    tournamentLineupId: STORYBOOK_LINEUP_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: storybookUser.id,
    user: storybookUser,
    tournamentLineup: {
      id: STORYBOOK_LINEUP_ID,
      name: "Lineup #1",
      players,
      winningScorePrediction: 150,
    },
  };
}

export function createStorybookLineupsList(
  playerIds: string[] = [],
): TournamentLineupListItem[] {
  return [
    {
      id: STORYBOOK_LINEUP_ID,
      name: "Lineup #1",
      players: buildLineupPlayersByIds(playerIds),
      winningScorePrediction: 150,
      contestLineups: [],
    },
  ];
}

export const lineupContestCardStoryDefaults = {
  roundDisplay: "R1",
  isEditable: true,
  contests: [
    {
      contest: contestFixtures.open,
      position: 1,
    },
  ],
};
