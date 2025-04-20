import type { Team } from './api';

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

interface TournamentCourse {
  id: string;
  name: string;
  yardage?: number;
  par?: number;
}

interface TournamentVenue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  courses?: TournamentCourse[];
  zipcode?: string;
  latitude?: number;
  longitude?: number;
}

interface TournamentLocation {
  city: string;
  state?: string;
  country: string;
}

interface Tournament {
  id: string;
  name: string;
  pgaTourId: string;
  startDate: string;
  endDate: string;
  manualActive: boolean;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  purse?: number;
  venue?: string | TournamentVenue;
  location?: string | TournamentLocation;
  beautyImage?: string;
}

interface PublicLeague {
  id: string;
  name: string;
  description?: string;
  maxTeams: number;
  memberCount: number;
  createdAt: string;
  teams: Team[];
  tournament?: Tournament;
}

interface PublicLeaguesResponse {
  leagues: PublicLeague[];
  tournament?: Tournament;
}

interface CreatePublicLeaguePayload {
  name: string;
  description?: string;
}

interface CreatePublicTeamPayload {
  name: string;
  players: string[];
  color?: string;
}

interface UpdatePublicTeamPayload {
  name?: string;
  players?: string[];
  color?: string;
}

export class PublicLeagueApiService {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      headers: {},
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return undefined for 204 responses
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Public League endpoints
  async listLeagues(): Promise<PublicLeaguesResponse> {
    return this.request<PublicLeaguesResponse>('GET', '/public-leagues');
  }

  async createLeague(data: CreatePublicLeaguePayload): Promise<PublicLeague> {
    // Get or generate user GUID
    const userGuid =
      localStorage.getItem('publicUserGuid') || crypto.randomUUID();

    return this.request<PublicLeague>('POST', '/public-leagues', {
      ...data,
      userId: userGuid,
    });
  }

  async getLeague(leagueId: string): Promise<PublicLeague> {
    return this.request<PublicLeague>('GET', `/public-leagues/${leagueId}`);
  }

  async joinLeague(leagueId: string): Promise<PublicLeague> {
    // Get or generate user GUID
    const userGuid =
      localStorage.getItem('publicUserGuid') || crypto.randomUUID();

    // Store the user GUID if it's new
    if (!localStorage.getItem('publicUserGuid')) {
      localStorage.setItem('publicUserGuid', userGuid);
    }

    return this.request<PublicLeague>(
      'POST',
      `/public-leagues/${leagueId}/join`,
      {
        userId: userGuid,
      }
    );
  }

  async leaveLeague(leagueId: string): Promise<void> {
    const userGuid = localStorage.getItem('publicUserGuid');
    if (!userGuid) {
      throw new Error('No user GUID found. Cannot leave league.');
    }

    return this.request<void>('POST', `/public-leagues/${leagueId}/leave`, {
      userId: userGuid,
    });
  }

  async createTeam(
    leagueId: string,
    data: CreatePublicTeamPayload
  ): Promise<Team> {
    // Generate a random user GUID if not stored in localStorage
    const userGuid =
      localStorage.getItem('publicUserGuid') || crypto.randomUUID();

    // Store the user GUID for future use
    if (!localStorage.getItem('publicUserGuid')) {
      localStorage.setItem('publicUserGuid', userGuid);
    }

    return this.request<Team>('POST', `/public-leagues/${leagueId}/teams`, {
      ...data,
      userId: userGuid,
    });
  }

  async updateTeam(
    leagueId: string,
    teamId: string,
    data: UpdatePublicTeamPayload
  ): Promise<Team> {
    const userGuid = localStorage.getItem('publicUserGuid');
    if (!userGuid) {
      throw new Error('No user GUID found. Cannot update team.');
    }

    return this.request<Team>(
      'PUT',
      `/public-leagues/${leagueId}/teams/${teamId}`,
      {
        ...data,
        userId: userGuid,
      }
    );
  }
}

// Create and export a singleton instance
export const publicLeagueApi = new PublicLeagueApiService();

// Export type definitions
export type {
  PublicLeague,
  Tournament,
  PublicLeaguesResponse,
  CreatePublicLeaguePayload,
  CreatePublicTeamPayload,
  UpdatePublicTeamPayload,
};
