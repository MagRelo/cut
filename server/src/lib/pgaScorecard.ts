import {
  scorecardResponseSchema,
  type Player,
  type Hole,
  type Nine,
  type RoundScore,
  type ScorecardData,
  type FormattedHoles,
  type Round,
  type Scorecard,
} from '../schemas/scorecard';

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
  roundScores: RoundScore[],
  roundNumber: number
): FormattedHoles | null {
  const round = roundScores.find((item) => item.roundNumber === roundNumber);
  if (!round) return null;

  const allHoles = [...round.firstNine.holes, ...round.secondNine.holes];

  return {
    holes: allHoles.map((h) => h.holeNumber),
    pars: allHoles.map((h) => h.par),
    scores: allHoles.map((h) => (h.score === '-' ? null : parseInt(h.score))),
    stableford: allHoles.map((h) => calculateStableford(h.par, h.score)),
  };
}

function calculateRoundTotal(holes: FormattedHoles): number {
  return holes.stableford.reduce((acc: number, val) => acc + (val ?? 0), 0);
}

function calculateHolesRemainingRatio(holes: FormattedHoles): number {
  const holesPlayed = holes.stableford.filter((score) => score !== null).length;
  return holesPlayed / holes.stableford.length;
}

function calculateRoundIcon(holes: FormattedHoles): string {
  const holesPlayed = holes.stableford.filter((score) => score !== null).length;
  if (holesPlayed < 4) return '';

  const roundScore = calculateRoundTotal(holes);
  const ratio = calculateHolesRemainingRatio(holes);
  const adjustedScore = roundScore / ratio;

  if (adjustedScore > 11) return '🔥';
  if (adjustedScore < 0) return '❄️';
  return '';
}

export async function fetchScorecard(
  playerId: string,
  tournamentId: string
): Promise<{
  playerId: string;
  playerName: string;
  tournamentId: string;
  tournamentName: string;
  R1: { holes: FormattedHoles; total: number; ratio: number; icon: string };
  R2: { holes: FormattedHoles; total: number; ratio: number; icon: string };
  R3: { holes: FormattedHoles; total: number; ratio: number; icon: string };
  R4: { holes: FormattedHoles; total: number; ratio: number; icon: string };
  stablefordTotal: number;
} | null> {
  if (!playerId || !tournamentId) return null;

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

  try {
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

    const data = await response.json();
    const validatedData = scorecardResponseSchema.parse(data);

    if (
      !validatedData.data?.scorecardV2 ||
      !validatedData.data.scorecardV2.player
    ) {
      return null;
    }

    const pgaScorecard = validatedData.data.scorecardV2;
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
            holes: [],
            pars: [],
            scores: [],
            stableford: [],
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

    // Calculate total stableford score
    const stablefordTotal = Object.values(rounds).reduce(
      (acc, round) => acc + round.total,
      0
    );

    const result = {
      playerId,
      playerName: `${pgaScorecard.player!.lastName}, ${
        pgaScorecard.player!.firstName
      }`,
      tournamentId,
      tournamentName: pgaScorecard.tournamentName,
      ...rounds,
      stablefordTotal,
    };

    return result as {
      playerId: string;
      playerName: string;
      tournamentId: string;
      tournamentName: string;
      R1: { holes: FormattedHoles; total: number; ratio: number; icon: string };
      R2: { holes: FormattedHoles; total: number; ratio: number; icon: string };
      R3: { holes: FormattedHoles; total: number; ratio: number; icon: string };
      R4: { holes: FormattedHoles; total: number; ratio: number; icon: string };
      stablefordTotal: number;
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching scorecard:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
}
