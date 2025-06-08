import { z } from 'zod';

export const weatherSchema = z.object({
  condition: z.string(),
  tempF: z.string().transform((val) => parseInt(val, 10)),
  windSpeedMPH: z.string().transform((val) => parseInt(val, 10)),
});

export const courseSchema = z.object({
  courseName: z.string(),
});

export const tournamentSchema = z.object({
  courses: z.array(courseSchema),
  id: z.string(),
  tournamentName: z.string(),
  tournamentStatus: z.string(),
  roundStatusDisplay: z.string(),
  roundDisplay: z.string(),
  currentRound: z.number(),
  weather: weatherSchema,
  beautyImage: z.string(),
  city: z.string(),
  state: z.string(),
  timezone: z.string(),
});

export const scoringDataSchema = z.object({
  position: z.string(),
  movementAmount: z.string(),
  movementDirection: z.string(),
  total: z.string(),
});

export const playerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export const playerRowV3Schema = z.object({
  __typename: z.literal('PlayerRowV3'),
  scoringData: scoringDataSchema,
  player: playerSchema,
});

export const leaderboardDataSchema = z.object({
  tournamentId: z.string(),
  tournamentName: z.string(),
  tournamentStatus: z.string(),
  roundStatusDisplay: z.string(),
  roundDisplay: z.string(),
  currentRound: z.number(),
  weather: z.string(),
  beautyImage: z.string(),
  courseName: z.string(),
  location: z.string(),
  timezone: z.string(),
  players: z.array(
    playerRowV3Schema.extend({
      pgaTourId: z.string(),
      playerName: z.string(),
      position: z.string(),
      positionBonus: z.number(),
      cutBonus: z.number(),
      movementAmount: z.string(),
      movementDirection: z.string(),
      movementIcon: z.string(),
      score: z.number(),
      scoreDisplay: z.string(),
    })
  ),
});

export const nextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      tournament: tournamentSchema,
      leaderboard: z.object({
        players: z
          .array(
            z.object({
              __typename: z.string(),
              scoringData: scoringDataSchema.optional(),
              player: playerSchema.optional(),
            })
          )
          .transform((players) =>
            players.filter(
              (p): p is PlayerRowV3 =>
                p.__typename === 'PlayerRowV3' &&
                p.scoringData !== undefined &&
                p.player !== undefined
            )
          ),
      }),
    }),
  }),
});

export type Weather = z.infer<typeof weatherSchema>;
export type Tournament = z.infer<typeof tournamentSchema>;
export type ScoringData = z.infer<typeof scoringDataSchema>;
export type PlayerRowV3 = z.infer<typeof playerRowV3Schema>;
export type LeaderboardData = z.infer<typeof leaderboardDataSchema>;
