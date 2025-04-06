import axios from 'axios';
import * as cheerio from 'cheerio';

interface CacheItem {
  data: any;
  timestamp: number;
}

interface Weather {
  condition: string;
  tempF: number;
  windSpeedMPH: number;
}

interface Tournament {
  courses: Array<{
    courseName: string;
  }>;
  id: string;
  tournamentName: string;
  tournamentStatus: string;
  roundStatusDisplay: string;
  roundDisplay: string;
  currentRound: number;
  weather: Weather;
  beautyImage: string;
  city: string;
  state: string;
  timezone: string;
}

interface ScoringData {
  position: string;
  movementAmount: string;
  movementDirection: string;
  total: string;
}

interface PlayerRowV3 {
  __typename: 'PlayerRowV3';
  scoringData: ScoringData;
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface LeaderboardData {
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  roundStatusDisplay: string;
  roundDisplay: string;
  currentRound: number;
  weather: string;
  beautyImage: string;
  courseName: string;
  location: string;
  timezone: string;
  players: Array<
    PlayerRowV3 & {
      pgaTourId: string;
      playerName: string;
      position: string;
      positionBonus: number;
      cutBonus: number;
      movementAmount: string;
      movementDirection: string;
      movementIcon: string;
      score: number;
      scoreDisplay: string;
    }
  >;
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
    const response = await axios.get('https://www.pgatour.com/leaderboard', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);

    // Get the JSON data from the __NEXT_DATA__ script tag
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (!nextDataScript) {
      throw new Error('Could not find __NEXT_DATA__ script');
    }

    // Parse the JSON data
    const leaderboardData = JSON.parse(nextDataScript);

    // Update cache
    cache.leaderboard = {
      data: leaderboardData,
      timestamp: now,
    };

    const rawTournament = leaderboardData.props.pageProps
      .tournament as Tournament;
    const rawPlayers = leaderboardData.props.pageProps.leaderboard
      .players as PlayerRowV3[];

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

    return obj;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      switch (error.response?.status) {
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
          throw new Error(`Failed to fetch leaderboard data: ${error.message}`);
      }
    }

    console.error('Error scraping PGA Tour data:', error);
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
  if (!score) return 200;
  if (position === 'WD') return 203;
  if (position === 'CUT') return 202;
  if (position === '-') return 201;
  if (score === 'E') return 0;
  return parseInt(score);
}

function calcMovementIcon(scoringObj: ScoringData): string {
  let icon = '';
  const movementThreshold = 15;
  const absoluteMovement = Math.abs(parseInt(scoringObj.movementAmount));

  if (
    scoringObj.movementDirection === 'UP' &&
    absoluteMovement >= movementThreshold
  ) {
    icon = ' 📈';
  } else if (
    scoringObj.movementDirection === 'DOWN' &&
    absoluteMovement >= movementThreshold
  ) {
    icon = ' 📉';
  }

  if (scoringObj.position === 'WD') {
    icon = ' ☠️';
  }

  return icon;
}
