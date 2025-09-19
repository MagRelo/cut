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

const PGA_API_URL = 'https://orchestrator.pgatour.com/graphql';
const PGA_API_KEY = process.env.PGA_API_KEY || 'da2-gsrx5bibzbb4njvhl7t37wqyl4';

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
        'X-API-Key': PGA_API_KEY,
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
