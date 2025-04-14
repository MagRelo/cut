// this file will be used to fetch data from the sports radar api. follow the conventions of the pga*.ts files.
// the API key is a .env variable called SPORTS_RADAR_API_KEY
// we need to fetch the following:

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Cache storage with 5 minute duration
const cache: { [key: string]: CacheItem<any> } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Update base URL to match working example
const BASE_URL = 'https://api.sportradar.com/golf/trial/pga/v3/en';

// Types based on XSD schemas
interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  courses: Course[];
}

interface Course {
  id: string;
  name: string;
  yardage: number;
  par: number;
  holes: number;
}

interface Tournament {
  id: string;
  name: string;
  status: 'scheduled' | 'inprogress' | 'completed' | 'cancelled';
  type: string;
  purse: number;
  start_date: string;
  end_date: string;
  course_timezone: string;
  venue: Venue;
  current_round: number;
  round_state: string;
  cut_line?: number;
  projected_cut_line?: number;
  cut_round?: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  rank?: number;
  status?: string;
  score?: number;
  strokes?: number;
  position?: number;
  tied?: boolean;
}

interface Round {
  number: number;
  status: string;
  score: number;
  strokes: number;
  holes: Hole[];
}

interface Hole {
  number: number;
  par: number;
  score?: number;
  strokes?: number;
}

interface Scorecard {
  tournament_id: string;
  player_id: string;
  rounds: Round[];
  total_score: number;
  total_strokes: number;
}

interface TournamentOdds {
  tournament_id: string;
  players: Array<{
    id: string;
    first_name: string;
    last_name: string;
    odds: number;
  }>;
}

interface PlayerScores {
  id: string;
  first_name: string;
  last_name: string;
  rounds: Round[];
  total_score: number;
  total_strokes: number;
}

interface TournamentScores {
  round: {
    number: string;
    players: PlayerScores[];
  };
}

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.SPORTS_RADAR_API_KEY;
  if (!apiKey) {
    throw new Error('SPORTS_RADAR_API_KEY environment variable not set');
  }

  const url = `${BASE_URL}${endpoint}?api_key=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      switch (response.status) {
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 403:
          throw new Error('Access forbidden. Invalid API key.');
        case 404:
          throw new Error('Resource not found.');
        default:
          throw new Error(`API request failed: ${response.statusText}`);
      }
    }

    const responseData = await response.json();

    return responseData as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching from SportsRadar API:', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

/**
 * Get the tournament schedule for the current season
 */
export async function getTournamentSchedule(
  year: number = 2025
): Promise<Tournament[]> {
  const cacheKey = `schedule_${year}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{ tournaments: Tournament[] }>(
    `/${year}/tournaments/schedule.json`
  );
  cache[cacheKey] = { data: data.tournaments, timestamp: now };
  return data.tournaments;
}

/**
 * Get the field (list of players) for a specific tournament
 */
export async function getTournamentField(
  tournamentId: string,
  year: number = 2025
): Promise<Player[]> {
  const cacheKey = `field_${year}_${tournamentId}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{
    field: any;
    tournament: {
      field: {
        players: Player[];
      };
    };
  }>(`/${year}/tournaments/${tournamentId}/summary.json`);

  const players = data.field;
  cache[cacheKey] = { data: players, timestamp: now };
  return players;
}

/**
 * Get the live leaderboard for a tournament round
 */
export async function getLiveTournamentLeaderboard(
  tournamentId: string,
  roundNumber: string = '01',
  year: number = 2025
): Promise<{
  round: {
    number: string;
    players: Player[];
  };
}> {
  const cacheKey = `leaderboard_${year}_${tournamentId}_${roundNumber}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{
    round: {
      number: string;
      players: Player[];
    };
  }>(`/${year}/tournaments/${tournamentId}/rounds/${roundNumber}/scores.json`);

  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * Get scorecards for all players in a tournament round
 */
export async function getPlayersScorecard(
  tournamentId: string,
  roundNumber: string = '01',
  year: number = 2025
): Promise<TournamentScores> {
  const cacheKey = `scorecard_${year}_${tournamentId}_${roundNumber}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<TournamentScores>(
    `/${year}/tournaments/${tournamentId}/rounds/${roundNumber}/scores.json`
  );
  cache[cacheKey] = { data, timestamp: now };
  return data;
}
