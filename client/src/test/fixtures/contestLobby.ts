import { deriveContestLobbyViewModel } from "../../hooks/deriveContestLobbyViewModel";
import { ContestState } from "../../hooks/useContestPredictionData";
import {
  type Contest,
  type ContestSettings,
  type ContestStatus,
  type TimelineData,
} from "../../types/contest";
import { type ContestLineup } from "../../types/lineup";
import { type ContestLobbyViewModel } from "../../types/contestLobby";

const baseSettings: ContestSettings = {
  contestType: "PUBLIC",
  chainId: 84532,
  expiryTimestamp: Math.floor(Date.now() / 1000) + 86400 * 7,
  paymentTokenAddress: "0x0000000000000000000000000000000000000001",
  paymentTokenSymbol: "CUT",
  oracle: "0x0000000000000000000000000000000000000002",
  primaryDeposit: 10,
  oracleFeeBps: 500,
  primaryDepositSecondarySubsidyBps: 0,
};

function buildContest(overrides: Partial<Contest> & { status: ContestStatus }): Contest {
  const { status, ...rest } = overrides;
  return {
    id: "contest-fixture-1",
    name: "Weekend Cut",
    description: null,
    tournamentId: "tournament-1",
    userGroupId: "group-1",
    endTime: new Date(Date.now() + 86400 * 1000 * 3),
    status,
    settings: baseSettings,
    address: "0x1234567890123456789012345678901234567890",
    chainId: 84532,
    createdAt: new Date(),
    updatedAt: new Date(),
    tournament: {
      id: "tournament-1",
      name: "Sample Open",
      status: status === "OPEN" ? "NOT_STARTED" : "IN_PROGRESS",
      startDate: new Date(Date.now() + 86400 * 1000).toISOString(),
      endDate: new Date(Date.now() + 86400 * 1000 * 4).toISOString(),
      course: "Sample CC",
      city: "Charlotte",
      state: "NC",
      roundDisplay: "R1",
      pgaTourId: "R2026001",
      beautyImage: null,
      timezone: "America/New_York",
      manualActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...rest,
  };
}

export const contestFixtures = {
  open: buildContest({ status: "OPEN" }),
  active: buildContest({ status: "ACTIVE" }),
  locked: buildContest({ status: "LOCKED" }),
  settled: buildContest({
    status: "SETTLED",
    results: {
      winningEntries: ["1"],
      payoutBps: [5000, 3000, 2000],
      detailedResults: [
        {
          entryId: "1",
          position: 1,
          score: 24,
          payoutBasisPoints: 5000,
          payoutAmountWei: "1000000000000000000",
          positionBonusAmountWei: "0",
          lineupName: "Lineup #1",
          username: "player1",
        },
      ],
    },
  }),
};

export function buildContestLineup(overrides: Partial<ContestLineup> = {}): ContestLineup {
  return {
    id: "lineup-1",
    contestId: contestFixtures.open.id,
    status: "ACTIVE",
    position: 1,
    score: 12,
    tournamentLineupId: "tl-1",
    entryId: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "user-1",
    user: {
      id: "user-1",
      name: "Player One",
      userType: "USER",
      isVerified: true,
      loginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { color: "#3B82F6" },
    },
    tournamentLineup: {
      id: "tl-1",
      name: "Lineup #1",
      players: [],
    },
    ...overrides,
  };
}

export function buildTimelineData(overrides: Partial<TimelineData> = {}): TimelineData {
  return {
    contestFinished: false,
    teams: [
      {
        contestLineupId: "lineup-1",
        userId: "user-1",
        name: "Player One",
        color: "#3B82F6",
        entryId: "1",
        dataPoints: [
          { timestamp: new Date().toISOString(), score: 4, roundNumber: 1 },
          { timestamp: new Date(Date.now() + 3600000).toISOString(), score: 8, roundNumber: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

export const contestWithLineups: Contest = {
  ...contestFixtures.active,
  contestLineups: [
    buildContestLineup(),
    buildContestLineup({
      id: "lineup-2",
      entryId: "2",
      position: 2,
      score: 8,
      userId: "user-2",
      user: {
        id: "user-2",
        name: "Player Two",
        userType: "USER",
        isVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: { color: "#10B981" },
      },
      tournamentLineup: { id: "tl-2", name: "Lineup #2", players: [] },
    }),
  ],
};

/** Extra lineups + entry IDs for Winner Pool / prediction Storybook and tests. */
export const contestWithPredictions: Contest = {
  ...contestFixtures.active,
  contestLineups: [
    buildContestLineup({
      entryId: "1",
      user: {
        id: "user-1",
        name: "Player One",
        userType: "USER",
        isVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: { color: "#3B82F6" },
      },
    }),
    buildContestLineup({
      id: "lineup-2",
      entryId: "2",
      position: 2,
      score: 18,
      userId: "user-2",
      user: {
        id: "user-2",
        name: "Player Two",
        userType: "USER",
        isVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: { color: "#10B981" },
      },
      tournamentLineup: { id: "tl-2", name: "Lineup #2", players: [] },
    }),
    buildContestLineup({
      id: "lineup-3",
      entryId: "3",
      position: 3,
      score: 14,
      userId: "user-3",
      user: {
        id: "user-3",
        name: "Player Three",
        userType: "USER",
        isVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: { color: "#F59E0B" },
      },
      tournamentLineup: { id: "tl-3", name: "Lineup #3", players: [] },
    }),
    buildContestLineup({
      id: "lineup-4",
      entryId: "4",
      position: 4,
      score: 9,
      userId: "user-4",
      user: {
        id: "user-4",
        name: "Player Four",
        userType: "USER",
        isVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: { color: "#8B5CF6" },
      },
      tournamentLineup: { id: "tl-4", name: "Lineup #4", players: [] },
    }),
  ],
};

export const contestWithTimeline: Contest = {
  ...contestWithLineups,
  timeline: buildTimelineData(),
};

export const contestLobbyViewModels: Record<string, ContestLobbyViewModel> = {
  openPreRound: deriveContestLobbyViewModel(contestFixtures.open, {
    contestStateOnChain: ContestState.OPEN,
    hasWallet: true,
  }),
  activeLive: deriveContestLobbyViewModel(contestWithTimeline, {
    contestStateOnChain: ContestState.ACTIVE,
    hasWallet: true,
  }),
  activeNoWallet: deriveContestLobbyViewModel(contestWithLineups, {
    contestStateOnChain: ContestState.ACTIVE,
    hasWallet: false,
  }),
  locked: deriveContestLobbyViewModel(contestFixtures.locked, {
    contestStateOnChain: ContestState.LOCKED,
    hasWallet: true,
  }),
  settled: deriveContestLobbyViewModel(contestFixtures.settled, {
    contestStateOnChain: ContestState.SETTLED,
    hasWallet: true,
  }),
  activeWagerLocked: deriveContestLobbyViewModel(contestFixtures.active, {
    contestStateOnChain: ContestState.ACTIVE,
    hasWallet: true,
  }),
};
