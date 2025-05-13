export interface Player {
  id: string;
  pga_pgaTourId?: string | null;
  pga_imageUrl?: string | null;
  pga_displayName?: string | null;
  pga_firstName?: string | null;
  pga_lastName?: string | null;
  pga_shortName?: string | null;
  pga_country?: string | null;
  pga_countryFlag?: string | null;
  pga_age?: number | null;
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
