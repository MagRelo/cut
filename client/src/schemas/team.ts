import { z } from 'zod';

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const teamUpdateSchema = z.object({
  name: z.string().optional(),
  players: z.array(playerSchema).optional(),
});

export const activePlayersSchema = z.object({
  teamId: z.string(),
  activePlayerIds: z.array(z.string()),
});

export type TeamUpdatePayload = z.infer<typeof teamUpdateSchema>;
export type ActivePlayersPayload = z.infer<typeof activePlayersSchema>;
export type PGAPlayer = z.infer<typeof playerSchema>;
