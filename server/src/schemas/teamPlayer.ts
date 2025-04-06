import { z } from 'zod';

// Schema for team player operations
export const createTeamPlayerSchema = z.object({
  teamId: z.string().cuid('Invalid team ID'),
  playerId: z.string().cuid('Invalid player ID'),
  active: z.boolean().default(true),
});

// Schema for updating team player status
export const updateTeamPlayerSchema = z.object({
  active: z.boolean(),
});

// Schema for team player ID validation
export const teamPlayerIdSchema = z.object({
  teamId: z.string().cuid('Invalid team ID'),
  playerId: z.string().cuid('Invalid player ID'),
});

// Types derived from schemas
export type CreateTeamPlayerBody = z.infer<typeof createTeamPlayerSchema>;
export type UpdateTeamPlayerBody = z.infer<typeof updateTeamPlayerSchema>;
export type TeamPlayerIdParams = z.infer<typeof teamPlayerIdSchema>;
