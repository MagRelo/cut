import { z } from 'zod';

export const playerSchema = z.object({
  id: z.string(),
  pga_pgaTourId: z.string().nullable().optional(),
  pga_imageUrl: z.string().nullable().optional(),
  pga_displayName: z.string().nullable().optional(),
  pga_firstName: z.string().nullable().optional(),
  pga_lastName: z.string().nullable().optional(),
  pga_shortName: z.string().nullable().optional(),
  pga_country: z.string().nullable().optional(),
  pga_countryFlag: z.string().nullable().optional(),
  pga_age: z.number().nullable().optional(),
  isActive: z.boolean(),
  inField: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncedAt: z.date().nullable().optional(),
});

export const teamUpdateSchema = z.object({
  name: z.string().optional(),
  players: z.array(z.string()).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

export const activePlayersSchema = z.object({
  teamId: z.string(),
  activePlayerIds: z.array(z.string()),
});

export type TeamUpdatePayload = z.infer<typeof teamUpdateSchema>;
export type ActivePlayersPayload = z.infer<typeof activePlayersSchema>;
export type PGAPlayer = z.infer<typeof playerSchema>;
