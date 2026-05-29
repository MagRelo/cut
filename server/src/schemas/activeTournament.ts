import { z } from "zod";

/** Week/setup fields — changes on init-tournament only. */
export const tournamentShellSchema = z.object({
  id: z.string(),
  pgaTourId: z.string(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  beautyImage: z.string().nullable().optional(),
  summarySections: z.any().optional(),
  timezone: z.string(),
  manualActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Cron-updated fields — refreshed every pipeline run. */
export const tournamentLiveSchema = z.object({
  status: z.string(),
  roundStatusDisplay: z.string().nullable().optional(),
  roundDisplay: z.string().nullable().optional(),
  currentRound: z.number().int().nullable().optional(),
  weather: z.any().optional(),
  course: z.string(),
  city: z.string(),
  state: z.string(),
});

export const activeTournamentShellResponseSchema = z.object({
  tournament: tournamentShellSchema,
});

export const activeTournamentLiveResponseSchema = z.object({
  tournament: tournamentLiveSchema,
  players: z.array(z.any()),
});

export type TournamentShell = z.infer<typeof tournamentShellSchema>;
export type TournamentLive = z.infer<typeof tournamentLiveSchema>;

export const tournamentShellSelect = {
  id: true,
  pgaTourId: true,
  name: true,
  startDate: true,
  endDate: true,
  beautyImage: true,
  summarySections: true,
  timezone: true,
  manualActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const tournamentLiveSelect = {
  status: true,
  roundStatusDisplay: true,
  roundDisplay: true,
  currentRound: true,
  weather: true,
  course: true,
  city: true,
  state: true,
} as const;
