import { z } from 'zod';

// Schema for creating a tournament lineup
export const createTournamentLineupSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  tournamentId: z.string().cuid('Invalid tournament ID'),
  name: z.string().min(1, 'Lineup name is required'),
  playerIds: z
    .array(z.string().cuid('Invalid player ID'))
    .min(1, 'At least one player is required'),
});

// Schema for updating a tournament lineup
export const updateTournamentLineupSchema = z.object({
  name: z.string().min(1, 'Lineup name is required').optional(),
  playerIds: z
    .array(z.string().cuid('Invalid player ID'))
    .min(1, 'At least one player is required')
    .optional(),
});

// Schema for lineup ID parameter
export const lineupIdSchema = z.object({
  id: z.string().cuid('Invalid lineup ID'),
});

// Schema for contest lineup operations
export const createContestLineupSchema = z.object({
  contestId: z.string().cuid('Invalid contest ID'),
  tournamentLineupId: z.string().cuid('Invalid tournament lineup ID'),
  userId: z.string().cuid('Invalid user ID'),
});

// Schema for updating contest lineup status
export const updateContestLineupSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED']),
  score: z.number().optional(),
  position: z.number().optional(),
});

// Types derived from schemas
export type CreateTournamentLineupBody = z.infer<
  typeof createTournamentLineupSchema
>;
export type UpdateTournamentLineupBody = z.infer<
  typeof updateTournamentLineupSchema
>;
export type LineupIdParam = z.infer<typeof lineupIdSchema>;
export type CreateContestLineupBody = z.infer<typeof createContestLineupSchema>;
export type UpdateContestLineupBody = z.infer<typeof updateContestLineupSchema>;
