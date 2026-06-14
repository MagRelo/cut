export const PGA_GOLF_SPORT_ID = "pga-golf" as const;

export interface GolfEventMetadata {
  name: string;
  pgaTourId: string;
  startDate?: string;
  endDate?: string;
  course?: string;
  city?: string;
  state?: string;
  timezone?: string;
  status: string;
  roundStatusDisplay?: string | null;
  roundDisplay?: string | null;
  currentRound?: number | null;
  weather?: unknown;
  beautyImage?: string | null;
  cutLine?: string | null;
  cutRound?: string | null;
  summarySections?: unknown;
  venue?: unknown;
  purse?: number | null;
}

export interface GolfParticipantMetadata {
  pgaTourId?: string | null;
  imageUrl?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  shortName?: string | null;
  country?: string | null;
  countryFlag?: string | null;
  age?: number | null;
  owgr?: string | null;
  fedex?: string | null;
  dataGolf?: unknown;
  inField?: boolean;
  isActive?: boolean;
}

export interface GolfScoreData {
  leaderboardPosition?: string | null;
  leaderboardTotal?: string | null;
  cut?: number | null;
  bonus?: number | null;
  stableford?: number | null;
  r1?: unknown;
  r2?: unknown;
  r3?: unknown;
  r4?: unknown;
  rCurrent?: unknown;
  teeTimes?: unknown;
}

export function parseGolfEventMetadata(metadata: unknown): GolfEventMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  if (typeof record.status !== "string") {
    return null;
  }
  return {
    name: typeof record.name === "string" ? record.name : "",
    pgaTourId: typeof record.pgaTourId === "string" ? record.pgaTourId : "",
    startDate: typeof record.startDate === "string" ? record.startDate : undefined,
    endDate: typeof record.endDate === "string" ? record.endDate : undefined,
    course: typeof record.course === "string" ? record.course : undefined,
    city: typeof record.city === "string" ? record.city : undefined,
    state: typeof record.state === "string" ? record.state : undefined,
    timezone: typeof record.timezone === "string" ? record.timezone : undefined,
    status: record.status,
    roundStatusDisplay:
      typeof record.roundStatusDisplay === "string" ? record.roundStatusDisplay : null,
    roundDisplay: typeof record.roundDisplay === "string" ? record.roundDisplay : null,
    currentRound: typeof record.currentRound === "number" ? record.currentRound : null,
    weather: record.weather,
    beautyImage: typeof record.beautyImage === "string" ? record.beautyImage : null,
    cutLine: typeof record.cutLine === "string" ? record.cutLine : null,
    cutRound: typeof record.cutRound === "string" ? record.cutRound : null,
    summarySections: record.summarySections,
    venue: record.venue,
    purse: typeof record.purse === "number" ? record.purse : null,
  };
}

export function golfPredictionValue(prediction: unknown): number | null {
  if (!prediction || typeof prediction !== "object" || Array.isArray(prediction)) {
    return null;
  }
  const record = prediction as Record<string, unknown>;
  if (record.type === "winningScore" && typeof record.value === "number") {
    return record.value;
  }
  return null;
}
