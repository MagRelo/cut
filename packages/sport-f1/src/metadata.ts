export const F1_SPORT_ID = "f1" as const;

export interface F1EventMetadata {
  season: number;
  round: number;
  meetingKey: number;
  sessionKey: number;
  circuitId: string;
  raceName: string;
  raceStart: string;
  raceEnd?: string;
  /** True once official session_result is synced */
  classificationComplete?: boolean;
}

export interface F1ParticipantMetadata {
  driverNumber?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  teamName?: string | null;
  teamColour?: string | null;
  headshotUrl?: string | null;
  countryCode?: string | null;
  championshipPosition?: number | null;
  seasonWins?: number | null;
  gridPosition?: number | null;
}

export type F1DriverStatus = "running" | "finished" | "dnf" | "dns" | "dsq";

export interface F1ScoreData {
  position?: number | null;
  status?: F1DriverStatus;
  finishPoints?: number;
  bonusPoints?: number;
  fastestLap?: boolean;
  /** True when points are estimated from running position, not final classification */
  provisional?: boolean;
  lapsCompleted?: number | null;
}

export function parseF1EventMetadata(metadata: unknown): F1EventMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const f1Raw = record.f1;
  if (!f1Raw || typeof f1Raw !== "object" || Array.isArray(f1Raw)) {
    return null;
  }

  const f1 = f1Raw as Record<string, unknown>;
  if (
    typeof f1.season !== "number" ||
    typeof f1.round !== "number" ||
    typeof f1.meetingKey !== "number" ||
    typeof f1.sessionKey !== "number" ||
    typeof f1.circuitId !== "string" ||
    typeof f1.raceName !== "string" ||
    typeof f1.raceStart !== "string"
  ) {
    return null;
  }

  return {
    season: f1.season,
    round: f1.round,
    meetingKey: f1.meetingKey,
    sessionKey: f1.sessionKey,
    circuitId: f1.circuitId,
    raceName: f1.raceName,
    raceStart: f1.raceStart,
    raceEnd: typeof f1.raceEnd === "string" ? f1.raceEnd : undefined,
    classificationComplete: f1.classificationComplete === true,
  };
}
