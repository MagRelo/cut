import {
  playerDirectoryResponseSchema,
  type PGAPlayer,
  type PGAError,
  type PlayerBio,
  type PlayerDirectoryResponse,
} from '../schemas/pgaTour.js';

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
        country
        countryFlag
        headshot
        playerBio {
          age
        }
      }
    }
  }`,
};

export async function fetchPGATourPlayers(): Promise<PGAPlayer[]> {
  try {
    const response = await fetch(PGA_TOUR_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': PGA_TOUR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(PLAYER_DIRECTORY_QUERY),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const validatedData = playerDirectoryResponseSchema.parse(data);

    if (validatedData.errors) {
      console.error('PGA Tour API Errors:', validatedData.errors);
      throw new Error('Failed to fetch PGA Tour players');
    }

    const uniquePlayers = validatedData.data.playerDirectory.players.filter(
      (player, index, self) =>
        index === self.findIndex((t) => t.id === player.id)
    );

    return uniquePlayers;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error instanceof TypeError) {
        console.error('Network Error:', error);
      }
    } else {
      console.error('Unknown error:', error);
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
