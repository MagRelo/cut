interface PGATournamentEvent {
  id: string;
  eventName: string;
  leaderboardId: string;
}

interface PGATournamentCourse {
  id: string;
  courseName: string;
  courseCode: string;
  hostCourse: boolean;
  scoringLevel: string;
}

interface PGATournamentWeather {
  logo: string;
  logoDark: string;
  logoAccessibility: string;
  tempF: number;
  tempC: number;
  condition: string;
  windDirection: string;
  windSpeedMPH: number;
  windSpeedKPH: number;
  precipitation: number;
  humidity: number;
  logoAsset: {
    imageOrg: string;
    imagePath: string;
  };
  logoDarkAsset: {
    imageOrg: string;
    imagePath: string;
  };
}

interface PGATournamentRightRailConfig {
  imageUrl: string;
  imageAltText: string;
  buttonLink: string;
  buttonText: string;
}

interface PGATournamentCategoryInfo {
  type: string;
  logoLight: string;
  logoLightAsset: {
    imageOrg: string;
    imagePath: string;
  };
  logoDark: string;
  logoDarkAsset: {
    imageOrg: string;
    imagePath: string;
  };
  label: string;
}

interface PGATournament {
  id: string;
  tournamentName: string;
  tournamentLogo: string;
  tournamentLocation: string;
  tournamentStatus: string;
  roundStatusDisplay: string;
  roundDisplay: string;
  roundStatus: string;
  roundStatusColor: string;
  currentRound: number;
  timezone: string;
  pdfUrl: string;
  seasonYear: number;
  displayDate: string;
  country: string;
  state: string;
  city: string;
  scoredLevel: string;
  infoPath: string;
  events: PGATournamentEvent[];
  courses: PGATournamentCourse[];
  weather: PGATournamentWeather;
  ticketsURL: string;
  tournamentSiteURL: string;
  formatType: string;
  features: string[];
  conductedByLabel: string;
  conductedByLink: string;
  beautyImage: string;
  hideRolexClock: boolean;
  hideSov: boolean;
  headshotBaseUrl: string;
  rightRailConfig: PGATournamentRightRailConfig;
  shouldSubscribe: boolean;
  ticketsEnabled: boolean;
  useTournamentSiteURL: boolean;
  beautyImageAsset: {
    imageOrg: string;
    imagePath: string;
  };
  disabledScorecardTabs: string[];
  leaderboardTakeover: boolean;
  tournamentCategoryInfo: PGATournamentCategoryInfo;
  tournamentLogoAsset: {
    imageOrg: string;
    imagePath: string;
  };
}

interface PGATournamentResponse {
  data: {
    tournaments: [PGATournament];
  };
}

/** Full weather object plus a human-readable formatted string for display. */
export type FormattedWeather = PGATournamentWeather & { formatted: string };

function conditionCaption(condition: string): string {
  switch (true) {
    case ["DAY_SUNNY", "DAY_MOSTLY_SUNNY"].includes(condition):
      return "☀️ Sunny";
    case ["DAY_PARTLY_CLOUDY", "DAY_MOSTLY_CLOUDY"].includes(condition):
      return "🌤 Partly Cloudy";
    case ["DAY_CLOUDY"].includes(condition):
      return "🌥 Cloudy";
    case ["DAY_RAINY"].includes(condition):
      return "🌧️ Rainy";
    case ["DAY_SCATTERED_SHOWERS"].includes(condition):
      return "🌦️ Scattered Showers";
    case ["DAY_THUNDERSTORMS"].includes(condition):
      return "⛈️ Thunderstorms";
    case ["DAY_FOG_MIST"].includes(condition):
      return "🌫️ Misty";
    case ["DAY_SNOW"].includes(condition):
      return "❄️ Snow";
    case [
      "NIGHT_CLEAR",
      "NIGHT_ISOLATED_CLOUDS",
      "NIGHT_PARTLY_CLOUDY",
      "NIGHT_MOSTLY_CLOUDY",
    ].includes(condition):
      return "🌙";
    default:
      return condition || "—";
  }
}

export function formatWeather(
  raw: PGATournamentWeather | null | undefined
): FormattedWeather | null {
  if (raw == null) return null;
  const tempF = typeof raw.tempF === "number" ? raw.tempF : 0;
  const windSpeedMPH = typeof raw.windSpeedMPH === "number" ? raw.windSpeedMPH : 0;
  const caption = conditionCaption(raw.condition ?? "");
  const formatted = `${tempF} · ${caption} · ${windSpeedMPH}mph`;
  return {
    ...raw,
    condition: raw.condition ?? "",
    tempF,
    tempC: typeof raw.tempC === "number" ? raw.tempC : 0,
    windDirection: raw.windDirection ?? "",
    windSpeedMPH,
    windSpeedKPH: typeof raw.windSpeedKPH === "number" ? raw.windSpeedKPH : 0,
    precipitation: typeof raw.precipitation === "number" ? raw.precipitation : 0,
    humidity: typeof raw.humidity === "number" ? raw.humidity : 0,
    formatted,
  };
}

const PGA_API_URL = 'https://orchestrator.pgatour.com/graphql';

function getPgaApiKey(): string {
  const key = process.env.PGA_API_KEY;
  if (!key) throw new Error('PGA_API_KEY environment variable is required');
  return key;
}

/**
 * Fetches a single tournament's data from the PGA Tour API
 * @param tournamentId - The ID of the tournament to fetch data for
 * @returns Promise containing the tournament data
 */
export async function getTournament(
  tournamentId: string
): Promise<PGATournament> {
  try {
    const query = `
      query Tournament($id: ID!) {
        tournaments(ids: [$id]) {
          id
          tournamentName
          tournamentLogo
          tournamentLocation
          tournamentStatus
          roundStatusDisplay
          roundDisplay
          roundStatus
          roundStatusColor
          currentRound
          timezone
          pdfUrl
          seasonYear
          displayDate
          country
          state
          city
          scoredLevel
          infoPath
          events {
            id
            eventName
            leaderboardId
          }
          courses {
            id
            courseName
            courseCode
            hostCourse
            scoringLevel
          }
          weather {
            logo
            logoDark
            logoAccessibility
            tempF
            tempC
            condition
            windDirection
            windSpeedMPH
            windSpeedKPH
            precipitation
            humidity
            logoAsset {
              imageOrg
              imagePath
            }
            logoDarkAsset {
              imageOrg
              imagePath
            }
          }
          ticketsURL
          tournamentSiteURL
          formatType
          features
          conductedByLabel
          conductedByLink
          beautyImage
          hideRolexClock
          hideSov
          headshotBaseUrl
          rightRailConfig {
            imageUrl
            imageAltText
            buttonLink
            buttonText
          }
          shouldSubscribe
          ticketsEnabled
          useTournamentSiteURL
          beautyImageAsset {
            imageOrg
            imagePath
          }
          disabledScorecardTabs
          leaderboardTakeover
          tournamentCategoryInfo {
            type
            logoLight
            logoLightAsset {
              imageOrg
              imagePath
            }
            logoDark
            logoDarkAsset {
              imageOrg
              imagePath
            }
            label
          }
          tournamentLogoAsset {
            imageOrg
            imagePath
          }
        }
      }
    `;

    const response = await fetch(PGA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': getPgaApiKey(),
      },
      body: JSON.stringify({
        query,
        variables: {
          id: tournamentId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as PGATournamentResponse;

    if (!data?.data?.tournaments?.[0]) {
      throw new Error('Invalid response format from PGA Tour API');
    }

    return data.data.tournaments[0];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch PGA Tour tournament data: ${error.message}`
      );
    }
    throw error;
  }
}
