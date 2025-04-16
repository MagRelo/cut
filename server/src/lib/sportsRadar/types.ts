export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  courses: Course[];
}

export interface Course {
  id: string;
  name: string;
  yardage: number;
  par: number;
  holes: number;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'scheduled' | 'inprogress' | 'completed' | 'cancelled';
  type: string;
  purse: number;
  start_date: string;
  end_date: string;
  course_timezone: string;
  venue: Venue;
  current_round: number;
  round_state: string;
  cut_line?: number;
  projected_cut_line?: number;
  cut_round?: number;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  rank?: number;
  status?: string;
  score?: number;
  strokes?: number;
  position?: number;
  tied?: boolean;
}

export interface Round {
  number: number;
  status: string;
  score: number;
  strokes: number;
  holes: Hole[];
}

export interface Hole {
  number: number;
  par: number;
  score?: number;
  strokes?: number;
}

export interface PlayerScores {
  id: string;
  first_name: string;
  last_name: string;
  rounds: Round[];
  total_score: number;
  total_strokes: number;
}

export interface TournamentScores {
  round: {
    number: string;
    players: PlayerScores[];
  };
}

export interface TournamentSummary {
  id: string;
  name: string;
  coverage: string;
  currency: string;
  start_date: string;
  end_date: string;
  event_type: string;
  field: Player[];
  parent_id: string;
  points: number;
  purse: number;
  rounds: {
    number: number;
    status: string;
    coverage: string;
    complete: boolean;
    scoring_complete: boolean;
  }[];
  seasons: {
    id: string;
    name: string;
    year: number;
  }[];
  status: string;
  venue: Venue;
}

export interface PlayerRound {
  score: number;
  strokes: number;
  thru: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  double_bogeys: number;
  other_scores: number;
  holes_in_one: number;
  sequence: number;
}

export interface LeaderboardPlayer {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  position: number;
  tied: boolean;
  money: number;
  points: number;
  score: number;
  strokes: number;
  abbr_name: string;
  rounds: PlayerRound[];
}

export interface TournamentLeaderboard {
  id: string;
  name: string;
  event_type: string;
  purse: number;
  winning_share: number;
  currency: string;
  points: number;
  start_date: string;
  end_date: string;
  course_timezone: string;
  status: string;
  cutline?: number;
  projected_cutline?: number;
  cut_round?: number;
  parent_id: string;
  seasons: Array<{
    id: string;
    year: number;
    tour: {
      id: string;
      alias: string;
      name: string;
    };
  }>;
  coverage: string;
  playoff?: LeaderboardPlayer[];
  leaderboard: LeaderboardPlayer[];
}
