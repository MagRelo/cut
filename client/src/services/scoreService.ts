import {
  type FormattedHoles,
  type ScorecardResponse,
  type Scorecard,
} from '../types/scorecard';

const PGA_API_KEY = 'da2-gsrx5bibzbb4njvhl7t37wqyl4';
const PGA_API_URL = 'https://orchestrator.pgatour.com/graphql';

function calculateStableford(par: number, score: string): number | null {
  if (score === '-') return null;

  const numericScore = parseInt(score);
  if (isNaN(numericScore)) return null;

  if (numericScore === 1) return 10; // hole-in-one

  const scoreDiff = numericScore - par;
  switch (scoreDiff) {
    case -4:
    case -3:
      return 15; // triple/double eagle
    case -2:
      return 5; // eagle
    case -1:
      return 2; // birdie
    case 0:
      return 0; // par
    case 1:
      return -1; // bogey
    default:
      return -3; // double or worse
  }
}

function formatHoles(
  roundScores: ScorecardResponse['data']['scorecardV2']['roundScores'],
  roundNumber: number
): FormattedHoles | null {
  const round = roundScores.find(
    (item: { roundNumber: number }) => item.roundNumber === roundNumber
  );
  if (!round) return null;

  if (!round.firstNine || !round.secondNine) {
    return null;
  }

  const allHoles = [...round.firstNine.holes, ...round.secondNine.holes];
  const total =
    typeof round.firstNine.parTotal + round.secondNine.parTotal === 'number'
      ? round.firstNine.parTotal + round.secondNine.parTotal
      : 0;

  return {
    round: roundNumber,
    par: allHoles.map((h) => h.par),
    scores: allHoles.map((h) =>
      h.score === '-' || !h.score ? null : parseInt(h.score)
    ),
    stableford: allHoles.map((h) => calculateStableford(h.par, h.score || '-')),
    total,
  };
}

function calculateRoundTotal(holes: FormattedHoles): number {
  return holes.stableford.reduce(
    (acc: number, val: number | null) => acc + (val ?? 0),
    0
  );
}

function calculateHolesRemainingRatio(holes: FormattedHoles): number {
  const holesPlayed = holes.stableford.filter(
    (score: number | null) => score !== null
  ).length;
  return holesPlayed / holes.stableford.length;
}

function calculateRoundIcon(holes: FormattedHoles): string {
  const holesPlayed = holes.stableford.filter(
    (score: number | null) => score !== null
  ).length;
  if (holesPlayed < 4) return '';

  const roundScore = calculateRoundTotal(holes);
  const ratio = calculateHolesRemainingRatio(holes);
  const adjustedScore = roundScore / ratio;

  if (adjustedScore > 11) return '🔥';
  if (adjustedScore < 0) return '❄️';
  return '';
}

async function fetchScorecardData(
  playerId: string,
  tournamentId: string
): Promise<ScorecardResponse> {
  const query = `
    query {
      scorecardV2(playerId: "${playerId}", id: "${tournamentId}") {
        tournamentName
        id
        player {
          firstName
          lastName
        }
        roundScores {
          roundNumber
          firstNine {
            parTotal
            holes {
              par
              holeNumber
              score
            }
          }
          secondNine {
            parTotal
            holes {
              par
              holeNumber
              score
            }
          }
        }
      }
    }
  `;

  const response = await fetch(PGA_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': PGA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fetchScorecard(
  playerId: string,
  tournamentId: string
): Promise<Scorecard | null> {
  if (!playerId || !tournamentId) return null;

  try {
    const data = await fetchScorecardData(playerId, tournamentId);
    const pgaScorecard = data.data?.scorecardV2;

    if (!pgaScorecard || !pgaScorecard.player) {
      return null;
    }

    const rounds: Record<
      string,
      {
        holes: FormattedHoles;
        total: number;
        ratio: number;
        icon: string;
      }
    > = {};

    // Format each round
    [1, 2, 3, 4].forEach((roundNumber) => {
      const holes = formatHoles(pgaScorecard.roundScores, roundNumber);
      if (!holes) {
        rounds[`R${roundNumber}`] = {
          holes: {
            round: roundNumber,
            par: [],
            scores: [],
            stableford: [],
            total: 0,
          },
          total: 0,
          ratio: 0,
          icon: '',
        };
        return;
      }

      rounds[`R${roundNumber}`] = {
        holes,
        total: calculateRoundTotal(holes),
        ratio: calculateHolesRemainingRatio(holes),
        icon: calculateRoundIcon(holes),
      };
    });

    return {
      playerId,
      playerName: `${pgaScorecard.player.firstName} ${pgaScorecard.player.lastName}`,
      tournamentId,
      tournamentName: pgaScorecard.tournamentName,
      R1: rounds.R1,
      R2: rounds.R2,
      R3: rounds.R3,
      R4: rounds.R4,
      stablefordTotal: Object.values(rounds).reduce(
        (sum, round) => sum + round.total,
        0
      ),
    };
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return null;
  }
}
