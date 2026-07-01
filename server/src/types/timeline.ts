// Timeline data types for contest lineup score tracking

export interface TimelineDataPoint {
  timestamp: string;
  score: number;
  periodNumber: number;
  /** Cost per $1 of potential winnings ($10 buy sim); null when not stored */
  sharePrice?: number | null;
}

export interface TimelineTeam {
  /** Join key to `ContestLineup.id` */
  contestLineupId: string;
  userId: string;
  name: string;
  /** Display name only (no lineup); used in chart legend */
  userName: string;
  color: string;
  /** On-chain primary entry id */
  entryId?: string | null;
  /** From settlement results; used for Final chart winner highlighting */
  isPrimaryPayoutWinner: boolean;
  dataPoints: TimelineDataPoint[];
}

export interface TimelineData {
  /** When true, client may show the all-rounds Final tab and dim non-payout lines */
  contestFinished: boolean;
  teams: TimelineTeam[];
}

// Database model types
export interface ContestLineupTimelineRecord {
  id: string;
  contestLineupId: string;
  contestId: string;
  timestamp: Date;
  periodNumber: number;
  score: number;
  position: number;
  sharePrice?: number | null;
  createdAt: Date;
}
