import { z } from 'zod';

// Enum for tournament status
export const TournamentStatus = {
  UPCOMING: 'UPCOMING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

// Base schema for tournament fields
const tournamentBaseSchema = {
  name: z.string().min(2, 'Tournament name must be at least 2 characters'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  course: z.string().min(2, 'Course name must be at least 2 characters'),
  city: z.string().min(2, 'City name must be at least 2 characters'),
  state: z.string().min(2, 'State name must be at least 2 characters'),
  timezone: z.string(),
  purse: z.number().positive('Purse must be positive').optional(),
  status: z.enum([
    TournamentStatus.UPCOMING,
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.COMPLETED,
  ]),
  roundStatusDisplay: z.string().optional(),
  roundDisplay: z.string().optional(),
  currentRound: z.number().int().optional(),
  weather: z.any().optional(), // Using any for JSON type
  beautyImage: z.string().optional(),
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
  }, 'End date must be after start date');

// Schema for tournament ID parameter
export const tournamentIdSchema = z.object({
  id: z.string().cuid('Invalid tournament ID'),
});

// Types derived from schemas
export type UpdateTournamentBody = z.infer<typeof updateTournamentSchema>;
export type TournamentIdParam = z.infer<typeof tournamentIdSchema>;

// Types for PGA Tour data
export type PGATourPlayer = {
  id: string;
  pgaTourId: string;
  position: number;
  scoringData: {
    r1Score?: number;
    r2Score?: number;
    r3Score?: number;
    r4Score?: number;
    totalScore?: number;
  };
  status: string;
  earnings?: number;
  fedExPoints?: number;
};

export type PGATourLeaderboard = {
  tournamentId: string;
  status: keyof typeof TournamentStatus;
  players: PGATourPlayer[];
};

export type PGATourScorecard = {
  r1Score?: number;
  r2Score?: number;
  r3Score?: number;
  r4Score?: number;
  totalScore?: number;
};
