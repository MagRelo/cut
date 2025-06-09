import { z } from 'zod';

// Enums
export const TournamentStatus = {
  UPCOMING: 'UPCOMING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type TournamentStatus =
  (typeof TournamentStatus)[keyof typeof TournamentStatus];

// Base Types
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

export interface TournamentCourse {
  id: string;
  name: string;
  holes: number;
  par: number;
  yardage: number;
  courseCode?: string;
  hostCourse?: boolean;
  scoringLevel?: string;
}

export interface TournamentLocation {
  city: string;
  state?: string;
  country: string;
}

// Main Tournament Type
export interface Tournament {
  id: string;
  pgaTourId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  course: string;
  city: string;
  state: string;
  timezone: string;
  venue?: Record<string, unknown>; // Json type in Prisma
  purse?: number;
  status: string;
  roundStatusDisplay?: string;
  roundDisplay?: string;
  currentRound?: number;
  weather?: Record<string, unknown>; // Json type in Prisma
  beautyImage?: string;
  cutLine?: string;
  cutRound?: string;
  manualActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Zod Schema for validation
export const tournamentSchema = z.object({
  id: z.string(),
  pgaTourId: z.string(),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  course: z.string(),
  city: z.string(),
  state: z.string(),
  timezone: z.string(),
  venue: z.record(z.any()).optional(),
  purse: z.number().optional(),
  status: z.string(),
  roundStatusDisplay: z.string().optional(),
  roundDisplay: z.string().optional(),
  currentRound: z.number().optional(),
  weather: z.record(z.any()).optional(),
  beautyImage: z.string().optional(),
  cutLine: z.string().optional(),
  cutRound: z.string().optional(),
  manualActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
