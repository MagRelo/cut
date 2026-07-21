import {
  buildPickPopularityMap,
  computePickRates,
  normalizePopularityRules,
  readCurrentPeriod,
  sumLineupScores,
  type PickPopularityMap,
  type ScoringRules,
} from "@cut/sport-sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";
import { lineupPicksInclude } from "../utils/prismaIncludes.js";
import { getActiveEvents } from "./events/getActiveEvents.js";

/** Stay at or below default Prisma connection_limit. */
const POSITION_UPDATE_CHUNK = 5;

function parseScoringRules(raw: unknown): ScoringRules {
  if (typeof raw !== "object" || raw === null) {
    return { aggregation: "sum", direction: "higher_wins" };
  }
  const obj = raw as Partial<ScoringRules>;
  const rules: ScoringRules = {
    aggregation: "sum",
    direction: obj.direction === "lower_wins" ? "lower_wins" : "higher_wins",
  };
  if (obj.popularity != null) {
    rules.popularity = obj.popularity;
  }
  return rules;
}

function parsePickPopularity(raw: unknown): PickPopularityMap | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const map: PickPopularityMap = {};
  for (const [epId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.pickRate !== "number" ||
      typeof row.bonus !== "number" ||
      typeof row.adjustedScore !== "number"
    ) {
      continue;
    }
    map[epId] = {
      pickRate: row.pickRate,
      bonus: row.bonus,
      adjustedScore: row.adjustedScore,
    };
  }
  return Object.keys(map).length > 0 ? map : null;
}

function pickRatesFromPopularityMap(
  map: PickPopularityMap | null,
): Map<string, number> | null {
  if (!map) return null;
  const rates = new Map<string, number>();
  for (const [epId, entry] of Object.entries(map)) {
    rates.set(epId, entry.pickRate);
  }
  return rates.size > 0 ? rates : null;
}

function pickPopularityEqual(
  a: PickPopularityMap | null,
  b: PickPopularityMap | null,
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const left = a[key];
    const right = b[key];
    if (!left || !right) return false;
    if (
      left.pickRate !== right.pickRate ||
      left.bonus !== right.bonus ||
      left.adjustedScore !== right.adjustedScore
    ) {
      return false;
    }
  }
  return true;
}

export async function updateContestLineupsForEvent(
  eventId: string,
  sportId: string,
): Promise<void> {
  const module = requireSportModule(sportId);

  const sport = await prisma.sport.findUnique({
    where: { id: sportId },
    select: { scoringRules: true },
  });
  const scoringRules = parseScoringRules(sport?.scoringRules);
  const popularityRules = normalizePopularityRules(scoringRules.popularity);

  const contestLineups = await prisma.contestLineup.findMany({
    where: {
      contest: { eventId },
    },
    include: {
      contest: {
        select: {
          id: true,
          status: true,
          pickPopularity: true,
          pickPopularityLockedAt: true,
        },
      },
      lineup: {
        include: lineupPicksInclude,
      },
    },
  });

  if (contestLineups.length === 0) {
    return;
  }

  const allEventParticipantIds = [
    ...new Set(
      contestLineups.flatMap((cl) =>
        cl.lineup.picks.map((pick) => pick.eventParticipantId),
      ),
    ),
  ];

  const totalsByEventParticipantId = new Map<string, number>();
  if (allEventParticipantIds.length > 0) {
    const rows = await prisma.eventParticipant.findMany({
      where: { id: { in: allEventParticipantIds } },
      select: { id: true, total: true },
    });
    for (const row of rows) {
      totalsByEventParticipantId.set(row.id, row.total ?? 0);
    }
  }

  const contestLineupsByContest = contestLineups.reduce(
    (acc, lineup) => {
      const contestId = lineup.contestId;
      if (!acc[contestId]) {
        acc[contestId] = [];
      }
      acc[contestId].push(lineup);
      return acc;
    },
    {} as Record<string, typeof contestLineups>,
  );

  /** Lineup ids whose score or position changed this tick (timeline snapshots). */
  const changedLineupIds = new Set<string>();
  let scoreWrites = 0;
  let positionWrites = 0;
  let popularityWrites = 0;

  for (const [contestId, lineups] of Object.entries(contestLineupsByContest)) {
    const contest = lineups[0]!.contest;
    const isOpen = contest.status === "OPEN";

    let pickPopularity: PickPopularityMap | null = null;

    if (!isOpen) {
      const lineupPickLists = lineups.map((cl) =>
        cl.lineup.picks.map((pick) => pick.eventParticipantId),
      );

      let frozenRates = pickRatesFromPopularityMap(
        parsePickPopularity(contest.pickPopularity),
      );

      if (contest.pickPopularityLockedAt == null) {
        frozenRates = computePickRates(
          lineupPickLists,
          popularityRules.minEntryFloor,
        );
      } else if (frozenRates == null && popularityRules.weight !== 0) {
        // Lineups are locked; recompute rates if map was omitted while weight was 0.
        frozenRates = computePickRates(
          lineupPickLists,
          popularityRules.minEntryFloor,
        );
      }

      pickPopularity = buildPickPopularityMap(
        frozenRates,
        totalsByEventParticipantId,
        popularityRules,
      );

      const previousPopularity = parsePickPopularity(contest.pickPopularity);
      const needsLock = contest.pickPopularityLockedAt == null;
      const popularityChanged = !pickPopularityEqual(
        previousPopularity,
        pickPopularity,
      );

      if (needsLock || popularityChanged) {
        await prisma.contest.update({
          where: { id: contestId },
          data: {
            pickPopularity:
              pickPopularity === null
                ? Prisma.DbNull
                : (pickPopularity as unknown as Prisma.InputJsonValue),
            ...(needsLock ? { pickPopularityLockedAt: new Date() } : {}),
          },
        });
        popularityWrites++;
      }
    }

    for (const contestLineup of lineups) {
      const eventParticipantIds = contestLineup.lineup.picks.map(
        (pick) => pick.eventParticipantId,
      );
      const { baseScore, score, popularityBonus } = sumLineupScores(
        eventParticipantIds,
        totalsByEventParticipantId,
        isOpen ? null : pickPopularity,
      );

      const scoreChanged =
        contestLineup.score !== score ||
        contestLineup.baseScore !== baseScore ||
        contestLineup.popularityBonus !== popularityBonus;

      contestLineup.score = score;
      contestLineup.baseScore = baseScore;
      contestLineup.popularityBonus = popularityBonus;

      if (scoreChanged) {
        await prisma.contestLineup.update({
          where: { id: contestLineup.id },
          data: { score, baseScore, popularityBonus },
        });
        changedLineupIds.add(contestLineup.id);
        scoreWrites++;
      }
    }
  }

  for (const lineups of Object.values(contestLineupsByContest)) {
    const ranked = module.rankEntries(
      lineups
        .filter((lineup) => lineup.entryId)
        .map((lineup) => ({
          entryId: lineup.entryId!,
          score: lineup.score,
          prediction: lineup.lineup.prediction,
          createdAt: lineup.createdAt,
        })),
    );
    const positionByEntryId = new Map(ranked.map((row) => [row.entryId, row.position]));

    const positionUpdates: { id: string; position: number }[] = [];

    for (const lineup of lineups) {
      const position = lineup.entryId
        ? (positionByEntryId.get(lineup.entryId) ?? 999)
        : 999;
      if (lineup.position !== position) {
        lineup.position = position;
        positionUpdates.push({ id: lineup.id, position });
        changedLineupIds.add(lineup.id);
      } else {
        lineup.position = position;
      }
    }

    for (let i = 0; i < positionUpdates.length; i += POSITION_UPDATE_CHUNK) {
      const chunk = positionUpdates.slice(i, i + POSITION_UPDATE_CHUNK);
      await Promise.all(
        chunk.map(({ id, position }) =>
          prisma.contestLineup.update({
            where: { id },
            data: { position },
          }),
        ),
      );
      positionWrites += chunk.length;
    }
  }

  if (changedLineupIds.size > 0) {
    const event = await prisma.competitionEvent.findUnique({
      where: { id: eventId },
      select: { metadata: true, sportId: true },
    });
    const currentPeriod = readCurrentPeriod(event?.metadata) ?? 1;
    const timestamp = new Date();

    const timelineSnapshots = contestLineups
      .filter((contestLineup) => changedLineupIds.has(contestLineup.id))
      .map((contestLineup) => ({
        contestLineupId: contestLineup.id,
        contestId: contestLineup.contestId,
        timestamp,
        periodNumber: currentPeriod,
        score: contestLineup.score ?? 0,
        position: contestLineup.position ?? 999,
        sharePrice: null,
      }));

    await prisma.contestLineupTimeline.createMany({
      data: timelineSnapshots,
    });
  }

  console.log(
    `[updateContestLineups] event=${eventId} scoreWrites=${scoreWrites} ` +
      `positionWrites=${positionWrites} popularityWrites=${popularityWrites} ` +
      `timelineRows=${changedLineupIds.size}`,
  );
}

export async function updateContestLineups(): Promise<void> {
  const events = await getActiveEvents();
  for (const event of events) {
    await updateContestLineupsForEvent(event.id, event.sportId);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateContestLineups()
    .then(() => {
      console.log("ContestLineups update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("ContestLineups update failed:", error);
      process.exit(1);
    });
}
