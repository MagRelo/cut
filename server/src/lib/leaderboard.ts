import * as cheerio from 'cheerio';
import {
  nextDataSchema,
  type Tournament,
  type Weather,
  type PlayerRowV3,
  type LeaderboardData,
  type ScoringData,
} from '../schemas/leaderboard';

interface CacheItem {
  data: any;
  timestamp: number;
}

// Cache storage
const cache: { [key: string]: CacheItem } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function scrapePGATourData(): Promise<LeaderboardData> {
  try {
    // Check cache first
    const now = Date.now();
    if (
      cache.leaderboard &&
      now - cache.leaderboard.timestamp < CACHE_DURATION
    ) {
      return cache.leaderboard.data;
    }

    // Fetch the page content
    const response = await fetch('https://www.pgatour.com/leaderboard', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      switch (response.status) {
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 403:
          throw new Error(
            'Access forbidden. Please check your request headers.'
          );
        case 404:
          throw new Error('Leaderboard data not found.');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error(
            'PGA Tour service is currently unavailable. Please try again later.'
          );
        default:
          throw new Error(
            `Failed to fetch leaderboard data: ${response.statusText}`
          );
      }
    }

    const html = await response.text();
    // Load the HTML into cheerio
    const $ = cheerio.load(html);

    // Get the JSON data from the __NEXT_DATA__ script tag
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (!nextDataScript) {
      throw new Error('Could not find __NEXT_DATA__ script');
    }

    // Parse and validate the JSON data
    const leaderboardData = nextDataSchema.parse(JSON.parse(nextDataScript));

    const rawTournament = leaderboardData.props.pageProps.tournament;
    const rawPlayers = leaderboardData.props.pageProps.leaderboard.players;

    const obj: LeaderboardData = {
      tournamentId: rawTournament.id,
      tournamentName: rawTournament.tournamentName,
      tournamentStatus: rawTournament.tournamentStatus,
      roundStatusDisplay: rawTournament.roundStatusDisplay,
      roundDisplay: rawTournament.roundDisplay,
      currentRound: rawTournament.currentRound,
      weather: formatWeather(rawTournament.weather),
      beautyImage: rawTournament.beautyImage,
      courseName: formatCourseName(rawTournament),
      location: `${rawTournament.city}, ${rawTournament.state}`,
      timezone: rawTournament.timezone,
      players: parsePlayers_V3(rawPlayers),
    };

    // Update cache
    cache.leaderboard = {
      data: obj,
      timestamp: now,
    };

    return obj;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error scraping PGA Tour data:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

function formatCourseName(tournament: Tournament): string {
  const courseName = tournament.courses[0].courseName;
  return courseName.length > 44
    ? `${courseName.substring(0, 36)}...`
    : courseName;
}

function formatWeather(weatherObject: Weather): string {
  let conditionCaption: string | null = null;

  switch (weatherObject.condition) {
    case 'DAY_SUNNY':
    case 'DAY_MOSTLY_SUNNY':
      conditionCaption = '☀️ Sunny';
      break;
    case 'DAY_PARTLY_CLOUDY':
    case 'DAY_MOSTLY_CLOUDY':
      conditionCaption = '🌤 Partly Cloudy';
      break;
    case 'DAY_CLOUDY':
      conditionCaption = '🌥 Cloudy';
      break;
    case 'DAY_RAINY':
      conditionCaption = '🌧️ Rainy';
      break;
    case 'DAY_SCATTERED_SHOWERS':
      conditionCaption = '🌦️ Scattered Showers';
      break;
    case 'DAY_THUNDERSTORMS':
      conditionCaption = '⛈️ Thunderstorms';
      break;
    case 'DAY_FOG_MIST':
      conditionCaption = 'Misty';
      break;
    case 'DAY_SNOW':
      conditionCaption = '❄️ Snow';
      break;
    case 'NIGHT_CLEAR':
    case 'NIGHT_ISOLATED_CLOUDS':
    case 'NIGHT_PARTLY_CLOUDY':
    case 'NIGHT_MOSTLY_CLOUDY':
      conditionCaption = '🌙';
      break;
    default:
      conditionCaption = weatherObject.condition;
  }

  return `${weatherObject.tempF} · ${conditionCaption} · ${weatherObject.windSpeedMPH}mph`;
}

function parsePlayers_V3(players: PlayerRowV3[]): LeaderboardData['players'] {
  const blnCutHasBeenMade = players.some(
    (leaderboardRow) => leaderboardRow?.scoringData?.position === 'CUT'
  );

  return players
    .filter(
      (player): player is PlayerRowV3 => player.__typename === 'PlayerRowV3'
    )
    .map((player) => {
      const position = player.scoringData.position;
      let positionBonus = 0;

      if (position === '1' || position === 'T1') {
        positionBonus = 10;
      } else if (position === '2' || position === 'T2') {
        positionBonus = 5;
      } else if (position === '3' || position === 'T3') {
        positionBonus = 3;
      }

      const losePointPositions = ['CUT', 'WD'] as const;
      const validPosition = !losePointPositions.includes(
        position as (typeof losePointPositions)[number]
      );
      const cutBonus = blnCutHasBeenMade && validPosition ? 3 : 0;

      return {
        ...player,
        playerName: player.player.firstName + ' ' + player.player.lastName,
        pgaTourId: player.player.id,
        position,
        positionBonus,
        cutBonus,
        movementAmount: player.scoringData.movementAmount,
        movementDirection: player.scoringData.movementDirection,
        movementIcon: calcMovementIcon(player.scoringData),
        score: normalizeScore(player.scoringData.total, position),
        scoreDisplay: player.scoringData.total,
      };
    });
}

function normalizeScore(score: string, position: string): number {
  if (position === 'CUT' || position === 'WD') {
    return 0;
  }
  return parseInt(score) || 0;
}

function calcMovementIcon(scoringObj: ScoringData): string {
  if (scoringObj.movementDirection === 'up') {
    return '⬆️';
  } else if (scoringObj.movementDirection === 'down') {
    return '⬇️';
  }
  return '➖';
}
