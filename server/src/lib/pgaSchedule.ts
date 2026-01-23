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
const PGA_API_KEY = process.env.PGA_API_KEY || "da2-gsrx5bibzbb4njvhl7t37wqyl4";

/**
 * Fetches the PGA Tour schedule and returns a flat list of upcoming tournaments.
 * @returns Promise containing a flat array of tournaments
 */
export async function fetchPgaSchedule() {
  try {
    const query = `
      query {
        schedule(tourCode: "R", year: "2026") {
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
        "X-API-Key": PGA_API_KEY,
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

    // Flatten tournaments into a single list
    const flatList: PGATournament[] = [];
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
