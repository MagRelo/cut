import { z } from "zod";

// Base Player Type (from Player table)
export interface Player {
  id: string;
  pga_pgaTourId?: string;
  pga_imageUrl?: string;
  pga_displayName?: string;
  pga_firstName?: string;
  pga_lastName?: string;
  pga_shortName?: string;
  pga_country?: string;
  pga_countryFlag?: string;
  pga_age?: number;
  pga_owgr?: number;
  pga_fedex?: number;
  pga_performance?: {
    standings: {
      id: string;
      logo: string;
      logoDark: string;
      title: string;
      description: string;
      total: string;
      totalLabel: string;
      rank: string;
      rankLogo: string | null;
      rankLogoDark: string | null;
      owgr: string;
      webview: string | null;
      webviewBrowserControls: boolean | null;
      detailCopy: string | null;
    };
    performance: Array<{
      tour: string;
      season: string;
      displaySeason: string;
      stats: Array<{
        title: string;
        value: string;
        career: string;
        wide: boolean;
      }>;
    }>;
  };
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

// Round Data Type
export interface RoundData {
  icon?: string;
  total?: number;
  ratio?: number;
  holes?: {
    round: number;
    par: number[];
    scores: (number | null)[];
    stableford: (number | null)[];
    total: number;
  };
}

// Tournament Player Type (from TournamentPlayer table)
export interface TournamentPlayerData {
  leaderboardPosition?: string;
  r1?: RoundData;
  r2?: RoundData;
  r3?: RoundData;
  r4?: RoundData;
  cut?: number;
  bonus?: number;
  total?: number;
  leaderboardTotal?: string;
}

// Combined Type for Frontend
export interface PlayerWithTournamentData extends Player {
  tournamentId: string;
  tournamentData: TournamentPlayerData;
}

// Tournament Lineup Type
export interface TournamentLineup {
  id: string;
  name?: string;
  players: PlayerWithTournamentData[];
}

// Zod Schemas
export const playerSchema = z.object({
  id: z.string(),
  pga_pgaTourId: z.string().optional(),
  pga_imageUrl: z.string().optional(),
  pga_displayName: z.string().optional(),
  pga_firstName: z.string().optional(),
  pga_lastName: z.string().optional(),
  pga_shortName: z.string().optional(),
  pga_country: z.string().optional(),
  pga_countryFlag: z.string().optional(),
  pga_age: z.number().optional(),
  pga_owgr: z.number().optional(),
  pga_fedex: z.number().optional(),
  pga_performance: z
    .object({
      standings: z.object({
        id: z.string(),
        logo: z.string(),
        logoDark: z.string(),
        title: z.string(),
        description: z.string(),
        total: z.string(),
        totalLabel: z.string(),
        rank: z.string(),
        rankLogo: z.string().nullable(),
        rankLogoDark: z.string().nullable(),
        owgr: z.string(),
        webview: z.string().nullable(),
        webviewBrowserControls: z.boolean().nullable(),
        detailCopy: z.string().nullable(),
      }),
      performance: z.array(
        z.object({
          tour: z.string(),
          season: z.string(),
          displaySeason: z.string(),
          stats: z.array(
            z.object({
              title: z.string(),
              value: z.string(),
              career: z.string(),
              wide: z.boolean(),
            }),
          ),
        }),
      ),
    })
    .optional(),
  isActive: z.boolean(),
  inField: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncedAt: z.date().optional(),
});

export const tournamentPlayerDataSchema = z.object({
  leaderboardPosition: z.string().optional(),
  r1: z.record(z.unknown()).optional(),
  r2: z.record(z.unknown()).optional(),
  r3: z.record(z.unknown()).optional(),
  r4: z.record(z.unknown()).optional(),
  rCurrent: z.record(z.unknown()).optional(),
  cut: z.number().optional(),
  bonus: z.number().optional(),
  total: z.number().optional(),
  leaderboardTotal: z.string().optional(),
});

export const playerWithTournamentDataSchema = playerSchema.extend({
  tournamentId: z.string(),
  tournamentData: tournamentPlayerDataSchema,
});

export const tournamentLineupSchema = z.object({
  players: z.array(playerWithTournamentDataSchema).max(4),
});
