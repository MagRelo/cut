/**
 * Replay last week's real HL prices through Wed close on the Live Eval contest.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-eval-replay
 *   pnpm --filter server run script:commodities-eval-replay 2026-W26
 */

import "dotenv/config";
process.env.COMMODITIES_USE_FIXTURE_PRICES = "false";

import { Prisma } from "@prisma/client";
import {
  COMMODITIES_SPORT_ID,
  commodityExternalId,
  getEventFieldSnapshot,
  transformCommodityDailyPrice,
} from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";
import { updateContestLineupsForEvent } from "../services/updateContestLineups.js";
import { formatCommoditiesWeekExternalId, resolveWeekAnchorDates } from "../sports/commodities/externalId.js";
import { initCommoditiesEvent } from "../sports/commodities/initEvent.js";
import { getSessionPricesForField } from "../sports/commodities/marketDataProvider.js";
import { mergeCommoditiesEventMetadata } from "../sports/commodities/metadataMerge.js";
import {
  formatSessionDisplayName,
  resolveWeeklySessionBounds,
} from "../sports/commodities/sessionConfig.js";
import {
  commoditiesPeriodDisplay,
  commoditiesPeriodStatusDisplay,
} from "../sports/commodities/sessionDisplay.js";

const EVAL_CONTEST_ADDRESS = "0x000000000000000000000000000000000000c013";
/** Wed close complete → Thu not started (R1–R3 final, R4+ zero). */
const REPLAY_THROUGH_ROUND = 3;
const REPLAY_AS_ROUND = REPLAY_THROUGH_ROUND + 1;

function previousWeekExternalId(now = new Date()): string {
  const ref = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tmp = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return formatCommoditiesWeekExternalId(tmp.getUTCFullYear(), week);
}

function parseWeekArg(): string {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  return args[0] ?? previousWeekExternalId();
}

async function remapContestLineupsToEvent(contestId: string, eventId: string): Promise<void> {
  const participants = await prisma.eventParticipant.findMany({
    where: { eventId },
    include: { participant: { select: { externalId: true } } },
  });
  const participantIdByExternal = new Map(
    participants.map((row) => [
      commodityExternalId(row.participant.externalId ?? ""),
      row.id,
    ] as const),
  );

  const lineups = await prisma.lineup.findMany({
    where: { contestId },
    include: {
      picks: {
        include: {
          eventParticipant: { include: { participant: { select: { externalId: true } } } },
        },
      },
    },
  });

  for (const lineup of lineups) {
    const externalIds = lineup.picks.map((pick) =>
      commodityExternalId(pick.eventParticipant.participant.externalId ?? ""),
    );

    await prisma.lineupPick.deleteMany({ where: { lineupId: lineup.id } });
    await prisma.lineup.update({
      where: { id: lineup.id },
      data: { eventId },
    });

    for (const externalId of externalIds) {
      const eventParticipantId = participantIdByExternal.get(externalId);
      if (!eventParticipantId) {
        throw new Error(`Missing event participant for ${externalId} on event ${eventId}`);
      }
      await prisma.lineupPick.create({
        data: { lineupId: lineup.id, eventParticipantId },
      });
    }
  }

  console.log(`[lineups] Remapped ${lineups.length} lineup(s) to event ${eventId}`);
}

async function main(): Promise<void> {
  const weekKey = parseWeekArg();
  const bounds = resolveWeeklySessionBounds(weekKey);
  const { monday: sessionDate } = resolveWeekAnchorDates(weekKey);

  const contest = await prisma.contest.findFirst({
    where: { address: EVAL_CONTEST_ADDRESS, chainId: 84532 },
    include: { event: true },
  });
  if (!contest?.event) {
    throw new Error(
      `Live Eval contest not found at ${EVAL_CONTEST_ADDRESS}. Run script:commodities-live-eval first.`,
    );
  }

  console.log(`\n=== Replay ${weekKey} through Wed (D${REPLAY_THROUGH_ROUND}) — live HL ===\n`);
  console.log(`Session: ${bounds.sessionOpen} → ${bounds.sessionClose}`);

  await initCommoditiesEvent(weekKey);
  const event = await prisma.competitionEvent.findFirstOrThrow({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: weekKey },
  });

  if (contest.eventId !== event.id) {
    await prisma.contest.update({
      where: { id: contest.id },
      data: { eventId: event.id },
    });
    console.log(`[contest] Re-linked to event ${event.id} (${weekKey})`);
  }

  await remapContestLineupsToEvent(contest.id, event.id);

  const field = getEventFieldSnapshot(event.metadata);
  const prices = await getSessionPricesForField({
    field,
    sessionDate,
    sessionOpen: bounds.sessionOpen,
    sessionClose: bounds.sessionClose,
    isComplete: false,
    existingScoresByTicker: new Map(),
  });

  for (const row of await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  })) {
    const ticker = commodityExternalId(row.participant.externalId ?? "");
    const snapshot = prices.get(ticker);
    if (!snapshot) {
      continue;
    }

    const wedClose = snapshot.dayClosePrices[REPLAY_THROUGH_ROUND - 1] ?? null;
    const payload = transformCommodityDailyPrice({
      openPrice: snapshot.openPrice,
      dayClosePrices: snapshot.dayClosePrices,
      currentPrice: wedClose,
      closePrice: null,
      isComplete: false,
      currentPeriod: REPLAY_AS_ROUND,
      provisional: true,
    });

    await prisma.eventParticipant.update({
      where: { id: row.id },
      data: {
        total: payload.total,
        scoreData: payload.scoreData as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: {
      metadata: mergeCommoditiesEventMetadata(event.metadata, {
        name: `${formatSessionDisplayName(weekKey)} (replay through Wed)`,
        periodDisplay: commoditiesPeriodDisplay(REPLAY_THROUGH_ROUND),
        currentPeriod: REPLAY_THROUGH_ROUND,
        periodStatusDisplay: commoditiesPeriodStatusDisplay(REPLAY_THROUGH_ROUND, false),
        commodities: {
          sessionOpen: bounds.sessionOpen,
          sessionClose: bounds.sessionClose,
          sessionStarted: true,
          sessionComplete: false,
        },
      }) as Prisma.InputJsonValue,
    },
  });

  await updateContestLineupsForEvent(event.id, COMMODITIES_SPORT_ID);

  const scoredParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: { select: { externalId: true, displayName: true } } },
  });

  const contestLineups = await prisma.contestLineup.findMany({
    where: { contestId: contest.id },
    orderBy: { position: "asc" },
    include: {
      lineup: {
        include: {
          picks: {
            include: {
              eventParticipant: {
                include: { participant: { select: { displayName: true } } },
              },
            },
          },
        },
      },
      user: { select: { name: true, email: true } },
    },
  });

  console.log("\nCommodity round scores (display pts, Mon/Tue/Wed):");
  const roundLabels = ["Mon", "Tue", "Wed"];
  for (const entry of field) {
    const snapshot = prices.get(entry.ticker);
    const ep = scoredParticipants.find(
      (row) => commodityExternalId(row.participant.externalId ?? "") === entry.ticker,
    );
    const scoreData = ep?.scoreData as Record<string, { total?: number } | null> | null;
    const rounds = [scoreData?.r1, scoreData?.r2, scoreData?.r3].map((round, index) => {
      const pts = String(round?.total ?? 0);
      return `${roundLabels[index]}=${pts}`;
    });
    const open = snapshot?.openPrice?.toFixed(2) ?? "?";
    const wed = snapshot?.dayClosePrices[2]?.toFixed(2) ?? "?";
    console.log(
      `  ${entry.displayName.padEnd(14)} open=${open} wed=${wed}  ${rounds.join("  ")}  total=${ep?.total ?? 0}`,
    );
  }

  console.log("\nLeaderboard (Mon–Wed only):");
  for (const row of contestLineups) {
    console.log(
      `  #${row.position} ${row.score ?? 0} pts — ${row.user.name ?? row.user.email} — "${row.lineup.name}"`,
    );
    const pickNames = row.lineup.picks
      .map((pick) => pick.eventParticipant.participant.displayName)
      .join(", ");
    console.log(`       picks: ${pickNames}`);
  }

  console.log("\nBrowse:");
  console.log(`  Event:   /sports/commodities/events/${event.id}`);
  console.log(`  Contest: /contest/${EVAL_CONTEST_ADDRESS}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
