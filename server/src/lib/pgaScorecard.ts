import { scorecardResponseSchema, type ScorecardData } from "../schemas/scorecard.js";

const PGA_API_URL = "https://orchestrator.pgatour.com/graphql";

function getPgaApiKey(): string {
  const key = process.env.PGA_API_KEY;
  if (!key) {
    throw new Error("PGA_API_KEY environment variable is required");
  }
  return key;
}

/**
 * Fetches raw scorecard data from the PGA Tour GraphQL API. No Stableford, round icons, or other transforms.
 */
export async function fetchScorecardRaw(
  playerId: string,
  tournamentId: string,
  signal?: AbortSignal
): Promise<ScorecardData | null> {
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
      method: "POST",
      ...(signal && { signal }),
      headers: {
        "X-API-Key": getPgaApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const validated = scorecardResponseSchema.parse(data);
    if (!validated.data?.scorecardV2 || !validated.data.scorecardV2.player) {
      return null;
    }
    return validated.data.scorecardV2;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching scorecard:", error.message);
    } else {
      console.error("Unknown error:", error);
    }
    return null;
  }
}
