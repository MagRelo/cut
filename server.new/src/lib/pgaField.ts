interface PGAPlayer {
  id: string;
  lastName: string;
  firstName: string;
  owgr: number;
}

interface PGAFieldResponse {
  data: {
    field: {
      tournamentName: string;
      players: PGAPlayer[];
    };
  };
}

const PGA_API_URL = "https://orchestrator.pgatour.com/graphql";
const PGA_API_KEY = process.env.PGA_API_KEY || "da2-gsrx5bibzbb4njvhl7t37wqyl4";

/**
 * Fetches the active players for a given tournament from the PGA Tour API
 * @param tournamentId - The ID of the tournament to fetch players for
 * @returns Promise containing the tournament name and list of players
 */
export async function getActivePlayers(tournamentId: string) {
  try {
    const query = `
      query {
        field(id: "${tournamentId}") {
          tournamentName
          players {
            id
            lastName
            firstName
            owgr
          }
        }
      }
    `;

    const response = await fetch(PGA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PGA_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PGA Tour field data: ${response.statusText}`);
    }

    const data = (await response.json()) as PGAFieldResponse;

    if (!data?.data?.field) {
      throw new Error("Invalid response format from PGA Tour API");
    }

    return {
      tournamentName: data.data.field.tournamentName,
      players: data.data.field.players,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch PGA Tour field data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Formats player data into array format
 * @param players - Array of PGA players
 * @returns Array of player data arrays [id, lastName, firstName, owgr]
 */
export function formatPlayersToArray(players: PGAPlayer[]): (string | number)[][] {
  return players.map((player) => [player.id, player.lastName, player.firstName, player.owgr]);
}
