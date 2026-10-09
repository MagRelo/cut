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

function getPgaApiKey(): string {
  const key = process.env.PGA_API_KEY;
  if (!key) throw new Error("PGA_API_KEY environment variable is required");
  return key;
}

function isRetryablePgaFieldError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Unexpected end of JSON input") ||
    message.includes("Invalid response format from PGA Tour API") ||
    message.startsWith("Failed to fetch PGA Tour field data:")
  );
}

async function requestActivePlayers(tournamentId: string) {
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
      "X-API-Key": getPgaApiKey(),
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
}

/**
 * Fetches the active players for a given tournament from the PGA Tour API.
 * A truncated body, non-OK response, or unexpected shape is tried once more.
 */
export async function getActivePlayers(tournamentId: string) {
  try {
    try {
      return await requestActivePlayers(tournamentId);
    } catch (error) {
      if (!isRetryablePgaFieldError(error)) {
        throw error;
      }
      return await requestActivePlayers(tournamentId);
    }
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.startsWith("Failed to fetch PGA Tour field data:")
        ? error.message
        : `Failed to fetch PGA Tour field data: ${error.message}`;
      throw new Error(message);
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
