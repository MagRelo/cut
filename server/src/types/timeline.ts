// Timeline data types for contest lineup score tracking

export interface TimelineDataPoint {
  timestamp: string;
  score: number;
  roundNumber: number;
  /** Cost per $1 of potential winnings ($10 buy sim); null when not stored */
  sharePrice?: number | null;
}

export interface TimelineTeam {
  name: string;
  color: string;
  dataPoints: TimelineDataPoint[];
}

export interface TimelineData {
  teams: TimelineTeam[];
}

// Database model types
export interface ContestLineupTimelineRecord {
  id: string;
  contestLineupId: string;
  contestId: string;
  timestamp: Date;
  roundNumber: number;
  score: number;
  position: number;
  sharePrice?: number | null;
  createdAt: Date;
}

