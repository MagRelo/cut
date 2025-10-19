import { z } from "zod";

const PGA_API_KEY = "da2-gsrx5bibzbb4njvhl7t37wqyl4";
const PGA_API_URL = "https://orchestrator.pgatour.com/graphql";

// Schema for the player profile data
const playerProfileSchema = z.object({
  id: z.string(),
  headshot: z.object({
    image: z.string(),
    country: z.string(),
    countryFlag: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  profileStandings: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      total: z.string(),
      totalLabel: z.string(),
      rank: z.string(),
      owgr: z.string().nullable(),
      webview: z.string().nullable(),
      webviewBrowserControls: z.boolean().nullable(),
      detailCopy: z.string().nullable(),
    })
  ),
  performance: z.array(
    z.object({
      tour: z.string(),
      season: z.string(),
      displaySeason: z.string(),
      stats: z.array(
        z.object({
          title: z.string(),
          value: z.string(),
          career: z.string(),
          wide: z.boolean(),
        })
      ),
    })
  ),
  snapshot: z.array(
    z.object({
      title: z.string(),
      value: z.string(),
      description: z.string().nullable(),
    })
  ),
});

const playerProfileResponseSchema = z.object({
  data: z.object({
    playerProfileOverview: playerProfileSchema,
  }),
});

type PlayerProfileData = z.infer<typeof playerProfileSchema>;

async function fetchPlayerProfileData(playerId: string, currentTour = "R"): Promise<any> {
  const query = `
    query PlayerProfileOverview($playerId: ID!, $currentTour: TourCode) {
      playerProfileOverview(playerId: $playerId, currentTour: $currentTour) {
        id
        headshot {
          image
          country
          countryFlag
          firstName
          lastName
        }
        profileStandings {
          id
          title
          description
          total
          totalLabel
          rank
          owgr
          webview
          webviewBrowserControls
          detailCopy
        }
        performance {
          tour
          season
          displaySeason
          stats {
            title
            value
            career
            wide
          }
        }
        snapshot {
          title
          value
          description
        }
      }
    }
  `;

  const response = await fetch(PGA_API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": PGA_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://www.pgatour.com",
      Referer: "https://www.pgatour.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      operationName: "PlayerProfileOverview",
      variables: {
        playerId,
        currentTour,
      },
      query,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error(`HTTP error! status: ${response.status}`, {
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    });
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as {
    errors?: Array<{ message: string }>;
    data?: {
      playerProfileOverview?: any;
    };
  };

  if (data.errors) {
    console.error(`API error for player ${playerId}:`, data.errors);
    throw new Error(`API error: ${data.errors[0]?.message || "Unknown error"}`);
  }

  if (!data.data?.playerProfileOverview) {
    console.error(`No profile data returned for player ${playerId}. Full response:`, data);
  }

  return data;
}

export async function getPlayerProfileOverview(
  playerId: string,
  currentTour?: string
): Promise<PlayerProfileData | null> {
  if (!playerId) {
    console.error("No player ID provided");
    return null;
  }

  try {
    const data = await fetchPlayerProfileData(playerId, currentTour);

    if (!data || typeof data !== "object") {
      console.error(`Invalid data structure returned from API for player ${playerId}`);
      return null;
    }

    if (!("data" in data)) {
      console.error(`Missing 'data' field in API response for player ${playerId}`);
      return null;
    }

    const responseData = data as { data?: { playerProfileOverview?: any } };
    if (!responseData.data?.playerProfileOverview) {
      console.error(`No profile data returned from API for player ${playerId}`);
      return null;
    }

    try {
      const validatedData = playerProfileResponseSchema.parse(data);
      return validatedData.data.playerProfileOverview;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error(`Validation error for player ${playerId}:`, {
          errors: validationError.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      } else {
        console.error(`Validation error for player ${playerId}:`, validationError);
      }
      return null;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching player profile for ${playerId}: ${error.message}`);
    } else {
      console.error(`Unknown error for player ${playerId}`);
    }
    return null;
  }
}
