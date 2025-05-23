import { type Team } from './team';
import { type TimelineData } from '../services/leagueApi';

export interface LeagueSettings {
  id: string;
  rosterSize: number;
  weeklyStarters: number;
  scoringType: string;
  draftDate?: Date | null;
  seasonStart?: Date | null;
  seasonEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueMember {
  id: string;
  userId: string;
  leagueId: string;
  role: string;
  joinedAt: Date;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface League {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    name: string;
  };
  leagueTeams?: Array<{
    team: {
      id: string;
      name: string;
      owner: {
        id: string;
        name: string;
        email: string;
      };
    };
  }>;
}

export interface PublicLeague extends League {
  isPublic: boolean;
  memberCount: number;
  teamCount: number;
  teams: Team[];
  members: Member[];
  owner: Member;
  tournament: Tournament;
  timelineData?: TimelineData;
}

export interface Tournament {
  id: string;
  name: string;
  pgaTourId: string;
  startDate: string;
  endDate: string;
  manualActive: boolean;
  status: string;
  purse?: number;
  venue?: TournamentVenue;
  location?: TournamentLocation;
  beautyImage?: string;
  course?: string;
  roundStatusDisplay?: string;
  roundDisplay?: string;
}

export interface TournamentVenue {
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

export interface TournamentLocation {
  city: string;
  state?: string;
  country: string;
}

export interface TournamentCourse {
  id: string;
  name: string;
  holes: number;
  par: number;
  yardage: number;
}
