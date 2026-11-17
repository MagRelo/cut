export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid cursor");
    this.name = "InvalidCursorError";
  }
}

export type WatchPick = {
  eventParticipantId: string;
  displayName: string;
  total: number | null;
  position: number | null;
};

export type WatchFeedItem = {
  id: string;
  text: string;
  generatedAt: string;
  entryIds: string[];
};

export type ContestWatch = {
  contestId: string;
  name: string;
  sportId: string;
  status: string;
  commentaryGeneratedAt: string | null;
  commentaryFeedGeneratedAt: string | null;
  overview: string | null;
  position: number | null;
  score: number | null;
  fieldSize: number;
  entryIds: string[];
  picks: WatchPick[];
  feedItems: WatchFeedItem[];
  payout: { amount: number; kind: "PRIMARY" | "SECONDARY" } | null;
};

type CursorPick = { total: number | null; position: number | null };

type CursorContest = {
  status: string;
  commentaryGeneratedAt: string | null;
  commentaryFeedGeneratedAt: string | null;
  position: number | null;
  score: number | null;
  picks: Record<string, CursorPick>;
  payoutAmount: number | null;
};

export type AgentCursorState = {
  v: 1;
  contests: Record<string, CursorContest>;
  referralCount: number;
  seenSettled: string[];
};

export type CompanionSignal =
  | "standing-changed"
  | "pick-changed"
  | "status-changed"
  | "commentary"
  | "payout";

export type CompanionUpdate = {
  contestId: string;
  name: string;
  sportId: string;
  status: string;
  standing: {
    position: number | null;
    previousPosition: number | null;
    total: number | null;
    fieldSize: number;
  };
  picks: WatchPick[];
  signals: CompanionSignal[];
  commentary: {
    generatedAt: string | null;
    overview: string | null;
    items: { id: string; text: string; generatedAt: string }[];
  };
  payout: { amount: number; kind: "PRIMARY" | "SECONDARY" } | null;
};

export type CompanionDiff = {
  cursor: string;
  unchanged: string[];
  updates: CompanionUpdate[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null | undefined {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function nullableNumber(value: unknown): number | null | undefined {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function parseContest(value: unknown): CursorContest | null {
  if (!isRecord(value) || typeof value.status !== "string") return null;
  const commentaryGeneratedAt = nullableString(value.commentaryGeneratedAt);
  const commentaryFeedGeneratedAt = nullableString(value.commentaryFeedGeneratedAt);
  const position = nullableNumber(value.position);
  const score = nullableNumber(value.score);
  const payoutAmount = nullableNumber(value.payoutAmount);
  if (
    commentaryGeneratedAt === undefined ||
    commentaryFeedGeneratedAt === undefined ||
    position === undefined ||
    score === undefined ||
    payoutAmount === undefined ||
    !isRecord(value.picks)
  ) {
    return null;
  }
  const picks: Record<string, CursorPick> = {};
  for (const [id, pick] of Object.entries(value.picks)) {
    if (!isRecord(pick)) return null;
    const total = nullableNumber(pick.total);
    const pickPosition = nullableNumber(pick.position);
    if (total === undefined || pickPosition === undefined) return null;
    picks[id] = { total, position: pickPosition };
  }
  return {
    status: value.status,
    commentaryGeneratedAt,
    commentaryFeedGeneratedAt,
    position,
    score,
    picks,
    payoutAmount,
  };
}

export function decodeCursor(raw: string): AgentCursorState {
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!isRecord(json) || json.v !== 1 || !isRecord(json.contests)) throw new InvalidCursorError();
    if (typeof json.referralCount !== "number" || !Array.isArray(json.seenSettled)) {
      throw new InvalidCursorError();
    }
    if (!json.seenSettled.every((id) => typeof id === "string")) throw new InvalidCursorError();
    const contests: Record<string, CursorContest> = {};
    for (const [id, contest] of Object.entries(json.contests)) {
      const parsed = parseContest(contest);
      if (!parsed) throw new InvalidCursorError();
      contests[id] = parsed;
    }
    return {
      v: 1,
      contests,
      referralCount: json.referralCount,
      seenSettled: json.seenSettled,
    };
  } catch (error) {
    if (error instanceof InvalidCursorError) throw error;
    throw new InvalidCursorError();
  }
}

export function encodeCursor(state: AgentCursorState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function picksRecord(picks: WatchPick[]): Record<string, CursorPick> {
  const record: Record<string, CursorPick> = {};
  for (const pick of picks) {
    record[pick.eventParticipantId] = { total: pick.total, position: pick.position };
  }
  return record;
}

function snapshot(row: ContestWatch): CursorContest {
  return {
    status: row.status,
    commentaryGeneratedAt: row.commentaryGeneratedAt,
    commentaryFeedGeneratedAt: row.commentaryFeedGeneratedAt,
    position: row.position,
    score: row.score,
    picks: picksRecord(row.picks),
    payoutAmount: row.payout?.amount ?? null,
  };
}

function samePicks(left: Record<string, CursorPick>, right: Record<string, CursorPick>): boolean {
  const leftIds = Object.keys(left).sort();
  const rightIds = Object.keys(right).sort();
  if (leftIds.join("\0") !== rightIds.join("\0")) return false;
  return leftIds.every((id) => {
    const a = left[id];
    const b = right[id];
    return a?.total === b?.total && a?.position === b?.position;
  });
}

function sameContest(left: CursorContest, right: CursorContest): boolean {
  return (
    left.status === right.status &&
    left.commentaryGeneratedAt === right.commentaryGeneratedAt &&
    left.commentaryFeedGeneratedAt === right.commentaryFeedGeneratedAt &&
    left.position === right.position &&
    left.score === right.score &&
    left.payoutAmount === right.payoutAmount &&
    samePicks(left.picks, right.picks)
  );
}

function relevantItems(row: ContestWatch, previousFeedAt: string | null): CompanionUpdate["commentary"]["items"] {
  const entryIds = new Set(row.entryIds);
  return row.feedItems
    .filter((item) => item.entryIds.some((id) => entryIds.has(id)))
    .filter((item) => previousFeedAt == null || item.generatedAt > previousFeedAt)
    .map(({ id, text, generatedAt }) => ({ id, text, generatedAt }));
}

function updateFor(row: ContestWatch, previous: CursorContest | null): CompanionUpdate {
  const current = snapshot(row);
  const signals: CompanionSignal[] = [];
  if (!previous || previous.status !== current.status) signals.push("status-changed");
  if (
    !previous
      ? current.position != null || current.score != null
      : previous.position !== current.position || previous.score !== current.score
  ) {
    signals.push("standing-changed");
  }
  if (!previous ? row.picks.some((pick) => pick.total != null || pick.position != null) : !samePicks(previous.picks, current.picks)) {
    signals.push("pick-changed");
  }
  const overviewChanged =
    !previous || previous.commentaryGeneratedAt !== current.commentaryGeneratedAt;
  const feedChanged =
    !previous || previous.commentaryFeedGeneratedAt !== current.commentaryFeedGeneratedAt;
  const items = feedChanged ? relevantItems(row, previous?.commentaryFeedGeneratedAt ?? null) : [];
  const overview = overviewChanged && row.overview ? row.overview : null;
  if ((overviewChanged && overview) || items.length > 0 || (feedChanged && previous != null)) {
    signals.push("commentary");
  }
  if (
    !previous ? current.payoutAmount != null : previous.payoutAmount !== current.payoutAmount
  ) {
    signals.push("payout");
  }
  return {
    contestId: row.contestId,
    name: row.name,
    sportId: row.sportId,
    status: row.status,
    standing: {
      position: row.position,
      previousPosition: previous?.position ?? null,
      total: row.score,
      fieldSize: row.fieldSize,
    },
    picks: row.picks,
    signals,
    commentary: {
      generatedAt: row.commentaryGeneratedAt,
      overview,
      items,
    },
    payout: row.payout,
  };
}

/**
 * First call (no cursor) lists every entered contest as unchanged and returns a cursor.
 * Later calls return only contests whose watched fields changed.
 */
export function diffCompanion(
  previous: AgentCursorState | null,
  rows: ContestWatch[],
  meta: { referralCount: number; seenSettled: string[] },
): CompanionDiff {
  const unchanged: string[] = [];
  const updates: CompanionUpdate[] = [];
  const contests: Record<string, CursorContest> = {};

  for (const row of rows) {
    const current = snapshot(row);
    contests[row.contestId] = current;
    const prior = previous?.contests[row.contestId] ?? null;
    if (previous && prior && sameContest(prior, current)) {
      unchanged.push(row.contestId);
      continue;
    }
    if (!previous) {
      unchanged.push(row.contestId);
      continue;
    }
    updates.push(updateFor(row, prior));
  }

  return {
    cursor: encodeCursor({
      v: 1,
      contests,
      referralCount: meta.referralCount,
      seenSettled: [...meta.seenSettled].sort(),
    }),
    unchanged,
    updates,
  };
}
