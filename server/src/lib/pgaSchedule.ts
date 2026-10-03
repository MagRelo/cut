interface PGATournament {
  id: string;
  tournamentName: string;
  sequenceNumber: number;
}

interface PGAScheduleResponse {
  data: {
    schedule: {
      seasonYear: number;
      upcoming: {
        tournaments: PGATournament[];
      }[];
    };
  };
}

const PGA_SCHEDULE_URL = "https://orchestrator.pgatour.com/graphql";

function getPgaApiKey(): string {
  return process.env.PGA_API_KEY || "da2-gsrx5bibzbb4njvhl7t37wqyl4";
}

export type PgaScheduleTournament = PGATournament;

/**
 * Fetches the PGA Tour schedule and returns a flat list of upcoming tournaments.
 */
export async function fetchPgaSchedule(
  year: string | number = new Date().getUTCFullYear(),
): Promise<PgaScheduleTournament[]> {
  try {
    const seasonYear = String(year);
    const query = `
      query {
        schedule(tourCode: "R", year: "${seasonYear}") {
          seasonYear
          upcoming {
            tournaments {
              id
              tournamentName
              sequenceNumber
            }
          }
        }
      }
    `;

    const response = await fetch(PGA_SCHEDULE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": getPgaApiKey(),
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PGA schedule: ${response.statusText}`);
    }

    const data = (await response.json()) as PGAScheduleResponse;

    const upcoming = data?.data?.schedule?.upcoming;
    if (!Array.isArray(upcoming)) {
      throw new Error("Invalid schedule data format");
    }

    const flatList: PgaScheduleTournament[] = [];
    for (const item of upcoming) {
      if (Array.isArray(item.tournaments)) {
        for (const tourney of item.tournaments) {
          flatList.push({
            tournamentName: tourney.tournamentName,
            id: tourney.id,
            sequenceNumber: tourney.sequenceNumber,
          });
        }
      }
    }
    return flatList;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch PGA schedule: ${error.message}`);
    }
    throw error;
  }
}
