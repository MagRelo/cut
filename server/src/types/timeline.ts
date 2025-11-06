// Timeline data types for contest lineup score tracking

export interface TimelineDataPoint {
  timestamp: string;
  score: number;
  roundNumber: number;
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
  createdAt: Date;
}

