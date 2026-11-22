export type ScoutFit = "league" | "affordable" | "open" | "field-ready";

export type ScoutBlockReason = "already-entered" | "field-empty" | "balance";

export type ScoutEvent = {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  status: string;
};

export type ScoutInput = {
  contestId: string;
  name: string;
  sportId: string;
  chainId: number;
  status: string;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  rosterSize: number;
  predictionRange: { min: number; max: number };
  fieldCount: number;
  alreadyEntered: boolean;
  event: ScoutEvent;
};

export type ScoutContest = Omit<ScoutInput, "alreadyEntered"> & {
  alreadyEntered: false;
  fit: ScoutFit[];
};

export type ScoutBlocked = {
  contestId: string;
  name: string;
  reason: ScoutBlockReason;
  primaryDeposit: number | null;
};

export type ScoutClassification = {
  contests: ScoutContest[];
  blocked: ScoutBlocked[];
};

function cents(value: number): number {
  return Math.round(value * 100);
}

function isFree(deposit: number | null): boolean {
  return deposit == null || deposit <= 0;
}

function canAfford(deposit: number | null, balanceUsdc: number | null): boolean {
  if (isFree(deposit)) return true;
  if (balanceUsdc == null || deposit == null) return false;
  return cents(balanceUsdc) >= cents(deposit);
}

function fitFor(row: ScoutInput, balanceUsdc: number | null): ScoutFit[] {
  const fit: ScoutFit[] = ["open", "field-ready"];
  if (row.userGroupId) fit.push("league");
  if (canAfford(row.primaryDeposit, balanceUsdc)) fit.push("affordable");
  return fit;
}

function ended(iso: string | null, now: number): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return Number.isFinite(time) && time <= now;
}

/** Still a choice: open, event not started, and the contest end time is ahead. */
export function scoutStillOpen(row: ScoutInput, now: Date): boolean {
  if (row.status !== "OPEN") return false;
  if (row.event.status !== "SCHEDULED") return false;
  const at = now.getTime();
  if (ended(row.endTime, at) || ended(row.event.end, at)) return false;
  return true;
}

/** Open contests the wallet can still enter, and the single reason each other open contest is blocked. */
export function classifyScout(
  rows: ScoutInput[],
  options: {
    balanceUsdc: number | null;
    now?: Date;
  },
): ScoutClassification {
  const now = options.now ?? new Date();
  const contests: ScoutContest[] = [];
  const blocked: ScoutBlocked[] = [];

  for (const row of rows) {
    if (!scoutStillOpen(row, now)) continue;
    const blockedRow = {
      contestId: row.contestId,
      name: row.name,
      primaryDeposit: row.primaryDeposit,
    };
    if (row.alreadyEntered) {
      blocked.push({ ...blockedRow, reason: "already-entered" });
      continue;
    }
    if (row.fieldCount <= 0) {
      blocked.push({ ...blockedRow, reason: "field-empty" });
      continue;
    }
    if (
      !isFree(row.primaryDeposit) &&
      options.balanceUsdc != null &&
      !canAfford(row.primaryDeposit, options.balanceUsdc)
    ) {
      blocked.push({ ...blockedRow, reason: "balance" });
      continue;
    }
    const { alreadyEntered: _alreadyEntered, ...rest } = row;
    contests.push({
      ...rest,
      alreadyEntered: false,
      fit: fitFor(row, options.balanceUsdc),
    });
  }

  return { contests, blocked };
}

export function openAffordableCount(contests: ScoutContest[]): number {
  return contests.filter((contest) => contest.fit.includes("affordable")).length;
}
