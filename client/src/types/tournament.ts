import { z } from "zod";

// Enums
export const TournamentStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

/** Used when `beautyImage` is unset, empty, or null (e.g. manual override not yet applied). */
export const DEFAULT_TOURNAMENT_BEAUTY_IMAGE =
  "https://res.cloudinary.com/pgatour-prod/ar_5,c_crop,g_north_east/d_placeholders:tournamentBackgroundSolid.png/pgatour/courses/r012/012/holes/hole18.jpg";

/** Resolves the header/hero image URL; API may omit `beautyImage` or send null. */
export function resolveTournamentBeautyImage(
  beautyImage: string | null | undefined,
): string {
  const trimmed = beautyImage?.trim();
  return trimmed || DEFAULT_TOURNAMENT_BEAUTY_IMAGE;
}

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
  startDate: string;
  endDate: string;
  course: string;
  city: string;
  state: string;
  timezone: string;
  venue?: Record<string, unknown>; // Json type in Prisma
  purse?: number;
  status: TournamentStatus;
  roundStatusDisplay?: string;
  roundDisplay?: string;
  currentRound?: number;
  weather?: Record<string, unknown>; // Json type in Prisma
  /** Optional; when missing or null, UI uses {@link DEFAULT_TOURNAMENT_BEAUTY_IMAGE}. */
  beautyImage?: string | null;
  cutLine?: string;
  cutRound?: string;
  summarySections?: TournamentSummarySections; // Json type in Prisma
  manualActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TournamentSummarySections = Array<{
  title: string;
  items: Array<{
    label?: string;
    body: string;
  }>;
}>;

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
  beautyImage: z.string().nullable().optional(),
  cutLine: z.string().optional(),
  cutRound: z.string().optional(),
  summarySections: z.any().optional(),
  manualActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
