/**
 * Compare asymmetric scoring models against live HL weekly sessions.
 * Usage: pnpm --filter server run script:commodities-scoring-models 5
 */

import "dotenv/config";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { pctReturnToLineupPoints } from "@cut/sport-commodities";
import { buildCommodityCatalog, buildFieldSnapshot } from "../sports/commodities/hyperliquidCatalog.js";
import { formatCommoditiesWeekExternalId } from "../sports/commodities/externalId.js";
import { fetchCandles } from "../sports/commodities/hyperliquidClient.js";
import {
  getCommoditiesSessionCloseTime,
  getCommoditiesSessionTimezone,
  resolveWeeklySessionBounds,
} from "../sports/commodities/sessionConfig.js";
import {
  candleFetchWindow,
  resolvePriceAtTimestamp,
  sessionCandleIntervals,
} from "../sports/commodities/sessionPricing.js";

process.env.COMMODITIES_USE_FIXTURE_PRICES = "false";

const LINEUPS = [
  { name: "Energy heavy", tickers: ["CL", "BRENTOIL", "GOLD"] },
  { name: "Precious/metals", tickers: ["GOLD", "SILVER", "COPPER"] },
  { name: "Balanced", tickers: ["GOLD", "CL", "SILVER"] },
];

type Model = {
  id: string;
  label: string;
  scorePick: (ctx: PickContext) => number;
};

type PickContext = {
  openPrice: number | null;
  candles: Array<{ t: number; c: string }>;
  dayMs: number[];
};

function padTime(v: string): string {
  const p = v.split(":");
  return p.length === 2 ? `${p[0]!.padStart(2, "0")}:${p[1]!.padStart(2, "0")}:00` : v;
}

function buildDayMs(openMs: number, closeMs: number): number[] {
  const tz = getCommoditiesSessionTimezone();
  const closeTime = padTime(getCommoditiesSessionCloseTime());
  const monday = new Date(openMs).toLocaleDateString("en-CA", { timeZone: tz });
  const ms = [openMs];
  for (let d = 0; d <= 4; d += 1) {
    const dateStr = addDays(new Date(`${monday}T12:00:00Z`), d).toISOString().slice(0, 10);
    const t = fromZonedTime(`${dateStr}T${closeTime}`, tz).getTime();
    if (t > openMs && t <= closeMs) ms.push(t);
  }
  if (ms[ms.length - 1] !== closeMs) ms.push(closeMs);
  return ms;
}

function pctBetween(
  candles: Array<{ t: number; c: string }>,
  fromMs: number,
  toMs: number,
): number | null {
  const from = resolvePriceAtTimestamp(candles, fromMs);
  const to = resolvePriceAtTimestamp(candles, toMs);
  if (from == null || to == null || from <= 0) return null;
  return ((to - from) / from) * 100;
}

function pctToStored(displayPts: number): number {
  return Math.round(displayPts * 10);
}

function asymmetricPct(pct: number, lossRatio: number): number {
  const scale = 10;
  const raw = pct >= 0 ? pct * scale : pct * scale * lossRatio;
  return pctToStored(raw);
}

function dailySum(
  ctx: PickContext,
  dayScore: (dayPct: number) => number,
): number {
  let total = 0;
  for (let i = 1; i < ctx.dayMs.length; i += 1) {
    const dayPct = pctBetween(ctx.candles, ctx.dayMs[i - 1]!, ctx.dayMs[i]!);
    if (dayPct != null) total += dayScore(dayPct);
  }
  return total;
}

/** Golf-style tiers on absolute daily % — gains bigger than losses. */
function stablefordDailyTiers(dayPct: number): number {
  const p = dayPct;
  if (p >= 3) return pctToStored(8);
  if (p >= 2) return pctToStored(5);
  if (p >= 1) return pctToStored(3);
  if (p >= 0.5) return pctToStored(1);
  if (p >= -0.5) return 0;
  if (p >= -1) return pctToStored(-1);
  if (p >= -2) return pctToStored(-2);
  return pctToStored(-3);
}

/** Softer tiers — preserves more magnitude via wider bands. */
function softTierDaily(dayPct: number): number {
  const p = dayPct;
  if (p >= 2) return pctToStored(p * 8); // 80% of linear on big up days
  if (p >= 0) return pctToStored(p * 10);
  if (p >= -2) return pctToStored(p * 5); // half penalty mid losses
  return pctToStored(p * 3); // 30% on crash days
}

const MODELS: Model[] = [
  {
    id: "linear",
    label: "Current: linear cumulative % × 10",
    scorePick: (ctx) => {
      const pct = pctBetween(ctx.candles, ctx.dayMs[0]!, ctx.dayMs[ctx.dayMs.length - 1]!);
      if (pct == null) return 0;
      return pctReturnToLineupPoints(pct, 1);
    },
  },
  {
    id: "gain-only",
    label: "B: daily gain-only (losses ignored)",
    scorePick: (ctx) =>
      dailySum(ctx, (dayPct) => (dayPct > 0 ? pctToStored(dayPct * 10) : 0)),
  },
  {
    id: "cum-40",
    label: "Cumulative asymmetric: full upside, losses × 0.4",
    scorePick: (ctx) => {
      const pct = pctBetween(ctx.candles, ctx.dayMs[0]!, ctx.dayMs[ctx.dayMs.length - 1]!);
      if (pct == null) return 0;
      return asymmetricPct(pct, 0.4);
    },
  },
  {
    id: "cum-50",
    label: "Cumulative asymmetric: full upside, losses × 0.5",
    scorePick: (ctx) => {
      const pct = pctBetween(ctx.candles, ctx.dayMs[0]!, ctx.dayMs[ctx.dayMs.length - 1]!);
      if (pct == null) return 0;
      return asymmetricPct(pct, 0.5);
    },
  },
  {
    id: "daily-40",
    label: "Daily asymmetric: full upside, losses × 0.4 (summed)",
    scorePick: (ctx) =>
      dailySum(ctx, (dayPct) =>
        dayPct >= 0 ? pctToStored(dayPct * 10) : pctToStored(dayPct * 10 * 0.4),
      ),
  },
  {
    id: "daily-cap",
    label: "Daily: full upside, loss capped at −5 pts/pick/day",
    scorePick: (ctx) =>
      dailySum(ctx, (dayPct) => {
        const raw = pctToStored(dayPct * 10);
        if (dayPct >= 0) return raw;
        return Math.max(raw, pctToStored(-5));
      }),
  },
  {
    id: "stableford-tiers",
    label: "Daily Stableford tiers (absolute %, not field rank)",
    scorePick: (ctx) => dailySum(ctx, stablefordDailyTiers),
  },
  {
    id: "soft-tier",
    label: "Daily soft tiers (80% up / 50% mid-loss / 30% crash)",
    scorePick: (ctx) => dailySum(ctx, softTierDaily),
  },
];

function getApproxIsoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function recentWeekKeys(count: number): string[] {
  const keys: string[] = [];
  let probe = new Date();
  while (keys.length < count) {
    probe = new Date(probe.getTime() - 7 * 24 * 60 * 60 * 1000);
    const key = formatCommoditiesWeekExternalId(probe.getUTCFullYear(), getApproxIsoWeek(probe));
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

async function fetchCandlesForWeek(hlCoin: string, openMs: number, closeMs: number) {
  for (const interval of sessionCandleIntervals(openMs, closeMs)) {
    const { startMs, endMs } = candleFetchWindow(openMs, closeMs, interval);
    const candles = await fetchCandles(hlCoin, interval, startMs, endMs);
    if (candles.length >= 2) return candles;
  }
  return [];
}

async function main(): Promise<void> {
  const weekCount = Number.parseInt(process.argv[2] ?? "5", 10);
  const field = buildFieldSnapshot(await buildCommodityCatalog());
  const weeks = recentWeekKeys(weekCount);

  type WeekResult = {
    weekKey: string;
    byModel: Map<string, { lineupScores: Map<string, number>; spread: number; avgFinal: number }>;
  };

  const allResults: WeekResult[] = [];

  for (const weekKey of weeks) {
    const bounds = resolveWeeklySessionBounds(weekKey);
    const openMs = new Date(bounds.sessionOpen).getTime();
    const closeMs = new Date(bounds.sessionClose).getTime();
    const dayMs = buildDayMs(openMs, closeMs);

    const pickCtx = new Map<string, PickContext>();
    for (const entry of field) {
      const candles = await fetchCandlesForWeek(entry.hlCoin, openMs, closeMs);
      pickCtx.set(entry.ticker, {
        openPrice: resolvePriceAtTimestamp(candles, openMs),
        candles,
        dayMs,
      });
    }

    const byModel = new Map<string, { lineupScores: Map<string, number>; spread: number; avgFinal: number }>();

    for (const model of MODELS) {
      const lineupScores = new Map<string, number>();
      for (const lineup of LINEUPS) {
        let total = 0;
        for (const ticker of lineup.tickers) {
          const ctx = pickCtx.get(ticker);
          if (ctx) total += model.scorePick(ctx);
        }
        lineupScores.set(lineup.name, total);
      }
      const sorted = [...lineupScores.values()].sort((a, b) => b - a);
      const spread = (sorted[0] ?? 0) - (sorted[1] ?? 0);
      const avgFinal = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      byModel.set(model.id, { lineupScores, spread, avgFinal });
    }

    allResults.push({ weekKey, byModel });
  }

  console.log("\nAsymmetric scoring model comparison (3 lineups × " + weeks.length + " weeks)\n");

  for (const model of MODELS) {
    const finals = allResults.flatMap((w) => [...(w.byModel.get(model.id)?.lineupScores.values() ?? [])]);
    const spreads = allResults.map((w) => w.byModel.get(model.id)?.spread ?? 0);
    const avgFinal = finals.reduce((a, b) => a + b, 0) / finals.length;
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    const positiveWeeks = finals.filter((f) => f > 0).length;
    const negativeWeeks = finals.filter((f) => f < 0).length;

    console.log(`${model.label}`);
    console.log(
      `  avg final: ${Math.round(avgFinal)} | avg 1st−2nd: ${Math.round(avgSpread)} | positive lineups: ${positiveWeeks}/${finals.length}`,
    );
  }

  console.log("\n--- Per-week winners (display pts) ---\n");
  console.log("Week       " + MODELS.map((m) => m.id.padEnd(14)).join(" "));
  for (const w of allResults) {
    const cols = MODELS.map((m) => {
      const data = w.byModel.get(m.id)!;
      const best = [...data.lineupScores.entries()].sort((a, b) => b[1] - a[1])[0];
      return (best?.[1] ?? 0).toFixed(0).padStart(14);
    });
    console.log(w.weekKey + "  " + cols.join(" "));
  }

  // Correlation with linear model (does ranking change?)
  console.log("\n--- Rank preservation vs linear (same winner % of weeks) ---\n");
  for (const model of MODELS) {
    if (model.id === "linear") continue;
    let sameWinner = 0;
    for (const w of allResults) {
      const linear = w.byModel.get("linear")!;
      const alt = w.byModel.get(model.id)!;
      const linearWinner = [...linear.lineupScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const altWinner = [...alt.lineupScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (linearWinner === altWinner) sameWinner += 1;
    }
    console.log(`  ${model.id.padEnd(18)} ${sameWinner}/${weeks.length} weeks same winner as linear`);
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
