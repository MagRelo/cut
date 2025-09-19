import { z } from 'zod';

export const pgaErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
});

export const playerBioSchema = z.object({
  age: z.union([z.number(), z.string().transform(Number), z.null()]),
});

export const pgaPlayerSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  firstName: z.string(),
  lastName: z.string(),
  shortName: z.string(),
  displayName: z.string(),
  country: z.string(),
  countryFlag: z.string(),
  headshot: z.string(),
  playerBio: playerBioSchema,
});

export const playerDirectoryResponseSchema = z.object({
  data: z.object({
    playerDirectory: z.object({
      tourCode: z.string(),
      players: z.array(pgaPlayerSchema),
    }),
  }),
  errors: z.array(pgaErrorSchema).optional(),
});

export type PGAError = z.infer<typeof pgaErrorSchema>;
export type PlayerBio = z.infer<typeof playerBioSchema>;
export type PGAPlayer = z.infer<typeof pgaPlayerSchema>;
export type PlayerDirectoryResponse = z.infer<
  typeof playerDirectoryResponseSchema
>;
