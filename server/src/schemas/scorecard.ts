import { z } from 'zod';

export const playerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

export const holeSchema = z.object({
  par: z.number(),
  holeNumber: z.number(),
  score: z.string(),
});

export const nineSchema = z.object({
  parTotal: z.number(),
  holes: z.array(holeSchema),
});

export const roundScoreSchema = z.object({
  roundNumber: z.number(),
  firstNine: nineSchema,
  secondNine: nineSchema,
});

export const scorecardDataSchema = z.object({
  tournamentName: z.string(),
  id: z.string(),
  player: playerSchema,
  roundScores: z.array(roundScoreSchema),
});

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

export const scorecardResponseSchema = z.object({
  data: z.object({
    scorecardV2: scorecardDataSchema,
  }),
  errors: z
    .array(
      z.object({
        message: z.string(),
      })
    )
    .optional(),
});

export type Player = z.infer<typeof playerSchema>;
export type Hole = z.infer<typeof holeSchema>;
export type Nine = z.infer<typeof nineSchema>;
export type RoundScore = z.infer<typeof roundScoreSchema>;
export type ScorecardData = z.infer<typeof scorecardDataSchema>;
export type FormattedHoles = z.infer<typeof formattedHolesSchema>;
export type Round = z.infer<typeof roundSchema>;
export type Scorecard = z.infer<typeof scorecardSchema>;
