import { z } from "zod";
import type { RoundData } from "../types/player.js";

// Enum for tournament status
export const TournamentStatus = {
  UPCOMING: "UPCOMING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

// Base schema for tournament fields
const tournamentBaseSchema = {
  pgaTourId: z.string(),
  name: z.string().min(2, "Tournament name must be at least 2 characters"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  course: z.string().min(2, "Course name must be at least 2 characters"),
  city: z.string().min(2, "City name must be at least 2 characters"),
  state: z.string().min(2, "State name must be at least 2 characters"),
  timezone: z.string(),
  venue: z.any().optional(), // JSON type
  purse: z.number().positive("Purse must be positive").optional(),
  status: z.enum([
    TournamentStatus.UPCOMING,
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.COMPLETED,
  ]),
  roundStatusDisplay: z.string().optional(),
  roundDisplay: z.string().optional(),
  currentRound: z.number().int().optional(),
  weather: z.any().optional(), // JSON type
  beautyImage: z.string().optional(),
  cutLine: z.string().optional(),
  cutRound: z.string().optional(),
  manualActive: z.boolean().default(false),
};

// Schema for updating a tournament
export const updateTournamentSchema = z
  .object({
    ...tournamentBaseSchema,
  })
  .partial()
  .refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  }, "End date must be after start date");

// Schema for tournament ID parameter
export const tournamentIdSchema = z.object({
  id: z.string().cuid("Invalid tournament ID"),
});

// Types derived from schemas
export type UpdateTournamentBody = z.infer<typeof updateTournamentSchema>;
export type TournamentIdParam = z.infer<typeof tournamentIdSchema>;

// Types for PGA Tour data
export type TournamentPlayer = {
  id: string;
  tournamentId: string;
  playerId: string;
  leaderboardPosition: string | null;
  r1: RoundData | null;
  r2: RoundData | null;
  r3: RoundData | null;
  r4: RoundData | null;
  rCurrent: RoundData | null;
  cut: number | null;
  bonus: number | null;
  stableford: number | null;
  total: number | null;
  leaderboardTotal: string | null;
  createdAt: Date;
  updatedAt: Date;
  player: {
    id: string;
    pga_pgaTourId: string | null;
    pga_imageUrl: string | null;
    pga_displayName: string | null;
    pga_firstName: string | null;
    pga_lastName: string | null;
    pga_shortName: string | null;
    pga_country: string | null;
    pga_countryFlag: string | null;
    pga_age: number | null;
    isActive: boolean;
    inField: boolean;
  };
};

export type TournamentLineup = {
  id: string;
  userId: string;
  tournamentId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  players: TournamentLineupPlayer[];
};

export type TournamentLineupPlayer = {
  id: string;
  tournamentLineupId: string;
  tournamentPlayerId: string;
  createdAt: Date;
  tournamentPlayer: TournamentPlayer;
};

export type Contest = {
  id: string;
  name: string;
  description: string | null;
  tournamentId: string;
  userGroupId: string;
  endTime: Date;
  address: string;
  chainId: number;
  status: string;
  settings: any | null;
  results: any | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContestLineup = {
  id: string;
  contestId: string;
  tournamentLineupId: string;
  userId: string;
  status: string;
  score: number | null;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
};
