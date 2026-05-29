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
  "https://res.cloudinary.com/pgatour-prod/w_854,h_480,c_fill,f_auto,q_auto/pgatour/news/editorial/2023/04/30/quail-hollow-1694-kk.png";

/** Resolves the header/hero image URL; API may omit `beautyImage` or send null. */
export function resolveTournamentBeautyImage(beautyImage: string | null | undefined): string {
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

/** Week/setup fields from GET /tournaments/active/shell (init-tournament). */
export interface TournamentShell {
  id: string;
  pgaTourId: string;
  name: string;
  startDate: string;
  endDate: string;
  beautyImage?: string | null;
  summarySections?: TournamentSummarySections;
  timezone: string;
  manualActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Cron-updated fields from GET /tournaments/active/live. */
export interface TournamentLive {
  status: TournamentStatus;
  roundStatusDisplay?: string | null;
  roundDisplay?: string | null;
  currentRound?: number | null;
  weather?: Record<string, unknown>;
  course: string;
  city: string;
  state: string;
}

/** Merged view for UI: shell + live (live overrides overlapping fields). */
export function mergeTournament(shell: TournamentShell, live: TournamentLive): Tournament {
  return {
    id: shell.id,
    pgaTourId: shell.pgaTourId,
    name: shell.name,
    startDate: shell.startDate,
    endDate: shell.endDate,
    timezone: shell.timezone,
    beautyImage: shell.beautyImage,
    summarySections: shell.summarySections,
    manualActive: shell.manualActive,
    createdAt: new Date(shell.createdAt),
    updatedAt: new Date(shell.updatedAt),
    status: live.status,
    roundStatusDisplay: live.roundStatusDisplay ?? undefined,
    roundDisplay: live.roundDisplay ?? undefined,
    currentRound: live.currentRound ?? undefined,
    weather: live.weather,
    course: live.course,
    city: live.city,
    state: live.state,
  };
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
