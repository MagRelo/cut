/** GET /api/bets/side/lineup/:lineupId/market · POST /api/bets/side/tickets uses tournamentLineupId + hitsRequired + topN */
export interface SideBetMarketSelectionDto {
  id: string;
  hitsRequired: number;
  topN: number;
  decimalOdds: number;
  americanDisplay: string;
  rowLabel: string;
  colLabel: string;
}

export interface SideBetMarketTicketDto {
  id: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  decimalOddsAtPlacement: number;
  americanDisplayAtPlacement: string;
  quoteVersionAtPlacement: number;
  status: string;
  createdAt: string;
}

export interface SideBetMarketResponse {
  bettable: boolean;
  marketStatus: string | null;
  unavailableReason: string | null;
  quoteVersion: number;
  dgEventName?: string | null;
  dgOddsLastUpdated?: string | null;
  selections: SideBetMarketSelectionDto[];
  tickets: SideBetMarketTicketDto[];
}

export interface AdminBatchSideBetOperationResult {
  success: boolean;
  marketId: string;
  error?: string;
}

export interface AdminBatchSideBetsResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: AdminBatchSideBetOperationResult[];
}
