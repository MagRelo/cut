// Types for the API response
interface Outcome {
  name: string;
  price: number;
}

interface Market {
  key: string;
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface OddsResponse {
  id: string;
  sport_key: string;
  bookmakers: Bookmaker[];
}

interface BookmakerOdds {
  [key: string]: Outcome[];
}

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

/**
 * Fetches available sports from the Odds API
 */
export async function getAvailableSports() {
  try {
    const response = await fetch(
      `${ODDS_API_BASE_URL}/sports?apiKey=${ODDS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching available sports:', error);
    throw error;
  }
}

/**
 * Fetches golf tournament odds from specified bookmakers
 * @param tournamentKey - The tournament key (e.g., 'golf_masters_tournament_winner')
 * @param bookmakers - Array of bookmaker keys to fetch odds from
 * @returns Object containing odds from specified bookmakers
 */
export async function getGolfTournamentOdds(
  tournamentKey: string,
  bookmakers: string[] = ['draftkings', 'fanduel']
): Promise<BookmakerOdds> {
  try {
    const url = new URL(`${ODDS_API_BASE_URL}/sports/${tournamentKey}/odds`);
    url.searchParams.append('apiKey', ODDS_API_KEY || '');
    url.searchParams.append('regions', 'us');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as OddsResponse[];

    if (!data.length) {
      throw new Error('No odds data available for this tournament');
    }

    const tournament = data[0];
    const odds: BookmakerOdds = {};

    // Extract odds for each requested bookmaker
    bookmakers.forEach((bookmakerKey) => {
      const bookmaker = tournament.bookmakers.find(
        (b) => b.key === bookmakerKey
      );
      if (bookmaker && bookmaker.markets.length > 0) {
        odds[bookmakerKey] = bookmaker.markets[0].outcomes;
      }
    });

    return odds;
  } catch (error) {
    console.error('Error fetching golf tournament odds:', error);
    throw error;
  }
}

/**
 * Gets the remaining API request quota
 */
export async function getRemainingApiQuota(): Promise<number> {
  try {
    const response = await fetch(
      `${ODDS_API_BASE_URL}/sports?apiKey=${ODDS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const remaining = response.headers.get('x-requests-remaining') as
      | string
      | null;
    return parseInt(remaining || '0', 10);
  } catch (error) {
    console.error('Error checking API quota:', error);
    throw error;
  }
}
