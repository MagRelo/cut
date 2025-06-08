import { z } from 'zod';

// Base schema for player fields
const playerBaseSchema = {
  name: z.string().min(1, 'Name is required'),
  pgaTourId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  country: z.string().optional(),
  countryFlag: z.string().optional(),
  age: z.number().int().min(0).optional(),
  inField: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

// Schema for creating a new player
export const createPlayerSchema = z.object({
  ...playerBaseSchema,
});

// Schema for updating an existing player
export const updatePlayerSchema = z
  .object({
    ...playerBaseSchema,
  })
  .partial();

// Schema for player ID validation
export const playerIdSchema = z.object({
  id: z.string().cuid('Invalid player ID'),
});

// Schema for adding a player to a team
export const teamPlayerSchema = z.object({
  teamId: z.string().cuid('Invalid team ID'),
  isActive: z.boolean().optional().default(false),
});

// Types derived from schemas
export type CreatePlayerBody = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerBody = z.infer<typeof updatePlayerSchema>;
