import type {
  SideBetMarketResponse,
  SideBetMarketSelectionDto,
  SideBetTicketListItemDto,
  SideBetTicketsListResponse,
} from "../../types/sideBet";

const ROW_LABELS = ["2 of 4", "3 of 4", "4 of 4"] as const;
const COL_LABELS = ["Top 5", "Top 10", "Top 20"] as const;

const AMERICAN_BY_CELL: Record<string, string> = {
  "Top 5|2 of 4": "+180",
  "Top 5|3 of 4": "+320",
  "Top 5|4 of 4": "+650",
  "Top 10|2 of 4": "+120",
  "Top 10|3 of 4": "+210",
  "Top 10|4 of 4": "+380",
  "Top 20|2 of 4": "-110",
  "Top 20|3 of 4": "+140",
  "Top 20|4 of 4": "+240",
};

const DECIMAL_BY_CELL: Record<string, number> = {
  "Top 5|2 of 4": 2.8,
  "Top 5|3 of 4": 4.2,
  "Top 5|4 of 4": 7.5,
  "Top 10|2 of 4": 2.2,
  "Top 10|3 of 4": 3.1,
  "Top 10|4 of 4": 4.8,
  "Top 20|2 of 4": 1.91,
  "Top 20|3 of 4": 2.4,
  "Top 20|4 of 4": 3.4,
};

function hitsFromRow(row: (typeof ROW_LABELS)[number]): number {
  if (row === "2 of 4") return 2;
  if (row === "3 of 4") return 3;
  return 4;
}

function topNFromCol(col: (typeof COL_LABELS)[number]): number {
  if (col === "Top 5") return 5;
  if (col === "Top 10") return 10;
  return 20;
}

/** Alias for Storybook / tests. */
export const buildSideBetSelectionsFixture = buildSideBetMarketSelections;

export function buildSideBetMarketSelections(): SideBetMarketSelectionDto[] {
  const selections: SideBetMarketSelectionDto[] = [];
  let index = 0;
  for (const col of COL_LABELS) {
    for (const row of ROW_LABELS) {
      const key = `${col}|${row}`;
      index += 1;
      selections.push({
        id: `selection-${index}`,
        hitsRequired: hitsFromRow(row),
        topN: topNFromCol(col),
        decimalOdds: DECIMAL_BY_CELL[key] ?? 2,
        americanDisplay: AMERICAN_BY_CELL[key] ?? "+200",
        rowLabel: row,
        colLabel: col,
      });
    }
  }
  return selections;
}

export function buildBettableSideBetMarket(
  overrides: Partial<SideBetMarketResponse> = {},
): SideBetMarketResponse {
  return {
    bettable: true,
    marketStatus: "OPEN",
    unavailableReason: null,
    quoteVersion: 1,
    selections: buildSideBetMarketSelections(),
    tickets: [],
    ...overrides,
  };
}

export function buildSideBetTicketsFixture(): SideBetTicketsListResponse {
  const placementPlayers = [
    { id: "p1", firstName: "Scottie", lastName: "Scheffler" },
    { id: "p2", firstName: "Rory", lastName: "McIlroy" },
    { id: "p3", firstName: "Jon", lastName: "Rahm" },
    { id: "p4", firstName: "Xander", lastName: "Schauffele" },
  ];

  const base = {
    lineupId: "tl-storybook-1",
    tournamentId: "tournament-1",
    marketStatus: "OPEN",
    quoteVersionAtPlacement: 1,
    playerIds: placementPlayers.map((p) => p.id),
    placementPlayers,
    createdAt: new Date().toISOString(),
  };

  const tickets: SideBetTicketListItemDto[] = [
    {
      ...base,
      id: "ticket-open",
      hitsRequired: 3,
      topN: 10,
      stakeAmount: 25,
      decimalOddsAtPlacement: 3.1,
      americanDisplayAtPlacement: "+210",
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      ...base,
      id: "ticket-won",
      hitsRequired: 2,
      topN: 20,
      stakeAmount: 10,
      decimalOddsAtPlacement: 1.91,
      americanDisplayAtPlacement: "-110",
      status: "WON",
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
    },
    {
      ...base,
      id: "ticket-lost",
      hitsRequired: 4,
      topN: 5,
      stakeAmount: 5,
      decimalOddsAtPlacement: 7.5,
      americanDisplayAtPlacement: "+650",
      status: "LOST",
      createdAt: new Date(Date.now() - 172800_000).toISOString(),
    },
    {
      ...base,
      id: "ticket-void",
      hitsRequired: 3,
      topN: 5,
      stakeAmount: 15,
      decimalOddsAtPlacement: 4.2,
      americanDisplayAtPlacement: "+320",
      status: "VOID",
      createdAt: new Date(Date.now() - 259200_000).toISOString(),
    },
  ];

  return { tickets };
}

export const STORYBOOK_SIDE_BET_LINEUP_ID = "tl-storybook-1";
