export interface Player {
  id: string;
  pgaTourId?: string | null;
  imageUrl?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  shortName?: string | null;
  country?: string | null;
  countryFlag?: string | null;
  age?: number | null;
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
}

export interface TournamentPlayer extends Player {
  position: number;
  scoringData: {
    r1Score?: number;
    r2Score?: number;
    r3Score?: number;
    r4Score?: number;
    totalScore?: number;
  };
  status: string;
  earnings?: number;
  fedExPoints?: number;
}
