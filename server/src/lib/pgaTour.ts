import axios from 'axios';

interface PGAError {
  message: string;
  code: string;
}

interface PlayerBio {
  id: string;
  age: number;
  education: string;
  turnedPro: string;
}

interface PGAPlayer {
  id: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  shortName: string;
  displayName: string;
  alphaSort: string;
  country: string;
  countryFlag: string;
  headshot: string;
  playerBio: PlayerBio;
}

interface PlayerDirectoryResponse {
  data: {
    playerDirectory: {
      tourCode: string;
      players: PGAPlayer[];
    };
  };
  errors?: PGAError[];
}

const PGA_TOUR_API_KEY =
  process.env.PGA_TOUR_API_KEY || 'da2-gsrx5bibzbb4njvhl7t37wqyl4';
const PGA_TOUR_GRAPHQL_URL = 'https://orchestrator.pgatour.com/graphql';

const PLAYER_DIRECTORY_QUERY = {
  operationName: 'PlayerDirectory',
  variables: {
    tourCode: 'R',
  },
  query: `query PlayerDirectory($tourCode: TourCode!, $active: Boolean) {
    playerDirectory(tourCode: $tourCode, active: $active) {
      tourCode
      players {
        id
        isActive
        firstName
        lastName
        shortName
        displayName
        alphaSort
        country
        countryFlag
        headshot
        playerBio {
          id
          age
          education
          turnedPro
        }
      }
    }
  }`,
};

export async function fetchPGATourPlayers(): Promise<PGAPlayer[]> {
  try {
    const response = await axios.post<PlayerDirectoryResponse>(
      PGA_TOUR_GRAPHQL_URL,
      PLAYER_DIRECTORY_QUERY,
      {
        headers: {
          'X-API-Key': PGA_TOUR_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.errors) {
      console.error('PGA Tour API Errors:', response.data.errors);
      throw new Error('Failed to fetch PGA Tour players');
    }

    return response.data.data.playerDirectory.players;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    } else {
      console.error('Error:', error);
    }
    throw new Error('Failed to fetch PGA Tour players');
  }
}

export async function searchPGATourPlayers(
  query: string
): Promise<PGAPlayer[]> {
  try {
    const players = await fetchPGATourPlayers();
    const searchQuery = query.toLowerCase();

    return players.filter(
      (player) =>
        player.displayName.toLowerCase().includes(searchQuery) ||
        player.firstName.toLowerCase().includes(searchQuery) ||
        player.lastName.toLowerCase().includes(searchQuery) ||
        player.shortName.toLowerCase().includes(searchQuery)
    );
  } catch (error) {
    console.error('Error searching PGA Tour players:', error);
    throw new Error('Failed to search PGA Tour players');
  }
}
