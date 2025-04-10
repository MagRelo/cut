import { z } from 'zod';

export const playerSchema = z
  .object({
    firstName: z.string().optional().default(''),
    lastName: z.string().optional().default(''),
  })
  .catchall(z.unknown());

export const holeSchema = z.object({
  par: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val) : val)),
  holeNumber: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val) : val)),
  score: z.string().nullable().default('-'),
});

export const nineSchema = z
  .object({
    parTotal: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === 'string' ? parseInt(val) : val)),
    holes: z.array(holeSchema).default([]),
  })
  .catchall(z.unknown());

export const roundScoreSchema = z
  .object({
    roundNumber: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === 'string' ? parseInt(val) : val)),
    firstNine: nineSchema.nullable().default(null),
    secondNine: nineSchema.nullable().default(null),
  })
  .catchall(z.unknown());

export const scorecardDataSchema = z
  .object({
    tournamentName: z.string().optional().default(''),
    id: z.string().optional().default(''),
    player: playerSchema.nullable().default(null),
    roundScores: z.array(roundScoreSchema).default([]),
  })
  .catchall(z.unknown());

export const formattedHolesSchema = z.object({
  holes: z.array(z.number()),
  pars: z.array(z.number()),
  scores: z.array(z.number().nullable()),
  stableford: z.array(z.number().nullable()),
});

export const roundSchema = z.object({
  holes: formattedHolesSchema,
  total: z.number(),
  ratio: z.number(),
  icon: z.string(),
});

export const scorecardSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  tournamentId: z.string(),
  tournamentName: z.string(),
  R1: roundSchema.nullable(),
  R2: roundSchema.nullable(),
  R3: roundSchema.nullable(),
  R4: roundSchema.nullable(),
  stablefordTotal: z.number(),
});

export const scorecardResponseSchema = z
  .object({
    data: z
      .object({
        scorecardV2: scorecardDataSchema,
      })
      .nullable()
      .optional(),
    errors: z
      .array(
        z
          .object({
            message: z.string(),
          })
          .catchall(z.unknown())
      )
      .optional(),
  })
  .catchall(z.unknown())
  .transform((data) => {
    // If data is null or undefined, return a default structure
    if (!data || !data.data || !data.data.scorecardV2) {
      return {
        data: {
          scorecardV2: {
            tournamentName: '',
            id: '',
            player: null,
            roundScores: [],
          },
        },
      };
    }
    return data;
  });

export type Player = z.infer<typeof playerSchema>;
export type Hole = z.infer<typeof holeSchema>;
export type Nine = z.infer<typeof nineSchema>;
export type RoundScore = z.infer<typeof roundScoreSchema>;
export type ScorecardData = z.infer<typeof scorecardDataSchema>;
export type FormattedHoles = z.infer<typeof formattedHolesSchema>;
export type Round = z.infer<typeof roundSchema>;
export type Scorecard = z.infer<typeof scorecardSchema>;
