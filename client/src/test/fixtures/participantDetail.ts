import type { Candidate } from "@cut/sport-sdk";
import type { RoundData } from "../../types/player";

const STORYBOOK_EVENT_ID = "tournament-storybook-detail";

const SAMPLE_PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];

/** Hand-picked scores and Stableford for a readable demo scorecard. */
const SAMPLE_SCORES_R1: (number | null)[] = [
  4, 3, 3, 5, 5, 4, 2, 5, 4, 4, 2, 6, 4, 3, 3, 5, 4, 3,
];
const SAMPLE_STABLEFORD_R1: (number | null)[] = [
  0, 3, 3, 2, 0, 0, 5, 0, 0, 0, 5, -3, 0, 3, 3, 0, 0, 3,
];

const SAMPLE_SCORES_R2_PARTIAL: (number | null)[] = [
  4, 4, 3, 5, 4, null, null, null, null, null, null, null, null, null, null, null, null, null,
];
const SAMPLE_STABLEFORD_R2_PARTIAL: (number | null)[] = [
  0, 0, 0, 2, 0, null, null, null, null, null, null, null, null, null, null, null, null, null,
];

function buildRoundData(
  roundNum: number,
  scores: (number | null)[],
  stableford: (number | null)[],
  total: number,
  extra: Partial<RoundData> = {},
): RoundData {
  const played = scores.filter((s) => s !== null).length;
  return {
    total,
    ratio: played / 18,
    ...extra,
    holes: {
      round: roundNum,
      par: SAMPLE_PAR,
      scores,
      stableford,
      total: scores.filter((s): s is number => s !== null).reduce((sum, s) => sum + s, 0),
    },
  };
}

function buildDetailCandidate(
  overrides: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    stableford?: number;
    position?: string;
    total?: string;
    scoreData?: Record<string, unknown>;
  } = {},
): Candidate {
  const firstName = overrides.firstName ?? "Scottie";
  const lastName = overrides.lastName ?? "Scheffler";
  const displayName = overrides.displayName ?? `${firstName} ${lastName}`;
  const stableford = overrides.stableford ?? 18;

  return {
    eventParticipantId: "ep-scheffler-detail",
    participantId: "participant-scheffler-detail",
    displayName,
    sortKeys: {
      stableford,
      name: displayName.toLowerCase(),
      owgr: 1,
      dataGolf: 1,
    },
    metadata: {
      externalId: "pga-scheffler-detail",
      participant: {
        firstName,
        lastName,
        country: "USA",
        imageUrl: null,
      },
      total: stableford,
      scoreData: {
        leaderboardPosition: overrides.position ?? "T3",
        leaderboardTotal: overrides.total ?? "-8",
        stableford,
        cut: 2,
        bonus: 1,
        teeTimes: [
          {
            roundNum: 1,
            teetimeIso: "2026-06-15T12:30:00.000Z",
            label: "Thu 8:30 AM ET",
          },
          {
            roundNum: 2,
            teetimeIso: "2026-06-16T17:10:00.000Z",
            label: "Fri 1:10 PM ET",
          },
        ],
        r1: buildRoundData(1, SAMPLE_SCORES_R1, SAMPLE_STABLEFORD_R1, 8, { icon: "🟢" }),
        r2: buildRoundData(2, SAMPLE_SCORES_R2_PARTIAL, SAMPLE_STABLEFORD_R2_PARTIAL, 4, {
          icon: "🟡",
        }),
        ...overrides.scoreData,
      },
    },
  };
}

/** Live tournament — full scorecard on R1, partial R2 in progress. */
export const FIXTURE_CANDIDATE_DETAIL_LIVE = buildDetailCandidate();

/** Pre-tournament — name/country only; R1 tee time, no hole data. */
export const FIXTURE_CANDIDATE_DETAIL_SCHEDULED = buildDetailCandidate({
  stableford: 0,
  position: "–",
  total: "–",
  scoreData: {
    leaderboardPosition: "–",
    leaderboardTotal: "–",
    stableford: 0,
    cut: undefined,
    bonus: undefined,
    r1: undefined,
    r2: undefined,
    r3: undefined,
    r4: undefined,
    teeTimes: [
      {
        roundNum: 1,
        teetimeIso: "2026-06-15T12:30:00.000Z",
        label: "Thu 8:30 AM ET",
      },
    ],
  },
});

/** Post-tournament — same scorecard data, complete status. */
export const FIXTURE_CANDIDATE_DETAIL_COMPLETE = buildDetailCandidate({
  stableford: 22,
  position: "1",
  total: "-12",
});

export const PARTICIPANT_DETAIL_FIXTURE_EVENT_ID = STORYBOOK_EVENT_ID;
