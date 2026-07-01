/**
 * Historical weekly session analysis — lineup score trajectories & spread.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-week-analysis
 *   pnpm --filter server run script:commodities-week-analysis 6   # last N weeks
 */

import "dotenv/config";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { pctReturnToLineupPoints } from "@cut/sport-commodities";
import { buildCommodityCatalog, buildFieldSnapshot } from "../sports/commodities/hyperliquidCatalog.js";
import {
  formatCommoditiesWeekExternalId,
  resolveWeekAnchorDates,
} from "../sports/commodities/externalId.js";
import { fetchCandles } from "../sports/commodities/hyperliquidClient.js";
import {
  getCommoditiesSessionCloseTime,
  getCommoditiesSessionOpenTime,
  getCommoditiesSessionTimezone,
  resolveWeeklySessionBounds,
} from "../sports/commodities/sessionConfig.js";
import {
  candleFetchWindow,
  resolvePriceAtTimestamp,
  sessionCandleIntervals,
} from "../sports/commodities/sessionPricing.js";

process.env.COMMODITIES_USE_FIXTURE_PRICES = "false";

type Checkpoint = { label: string; ms: number };

type LineupSpec = { name: string; tickers: string[] };

const LINEUPS: LineupSpec[] = [
  { name: "Energy heavy", tickers: ["CL", "BRENTOIL", "GOLD"] },
  { name: "Precious/metals", tickers: ["GOLD", "SILVER", "COPPER"] },
  { name: "Balanced", tickers: ["GOLD", "CL", "SILVER"] },
];

function padTimeSegment(value: string): string {
  const parts = value.split(":");
  if (parts.length === 2) {
    return `${parts[0]!.padStart(2, "0")}:${parts[1]!.padStart(2, "0")}:00`;
  }
  return value;
}

function buildCheckpoints(sessionOpenMs: number, sessionCloseMs: number): Checkpoint[] {
  const tz = getCommoditiesSessionTimezone();
  const closeTime = padTimeSegment(getCommoditiesSessionCloseTime());
  const open = new Date(sessionOpenMs);
  const mondayDate = open.toLocaleDateString("en-CA", { timeZone: tz }); // yyyy-MM-dd

  const checkpoints: Checkpoint[] = [{ label: "Mon open", ms: sessionOpenMs }];

  for (let dayOffset = 0; dayOffset <= 4; dayOffset += 1) {
    const date = addDays(new Date(`${mondayDate}T12:00:00Z`), dayOffset);
    const dateStr = date.toISOString().slice(0, 10);
    const closeMs = fromZonedTime(`${dateStr}T${closeTime}`, tz).getTime();
    if (closeMs <= sessionOpenMs) continue;
    if (closeMs > sessionCloseMs) {
      checkpoints.push({ label: "Fri close", ms: sessionCloseMs });
      break;
    }
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    checkpoints.push({ label: `${dayNames[dayOffset]} close`, ms: closeMs });
  }

  const last = checkpoints[checkpoints.length - 1];
  if (!last || last.ms !== sessionCloseMs) {
    checkpoints.push({ label: "Fri close", ms: sessionCloseMs });
  }

  return checkpoints;
}

async function fetchSessionCandles(
  hlCoin: string,
  sessionOpenMs: number,
  sessionCloseMs: number,
): Promise<Array<{ t: number; c: string }>> {
  for (const interval of sessionCandleIntervals(sessionOpenMs, sessionCloseMs)) {
    const { startMs, endMs } = candleFetchWindow(sessionOpenMs, sessionCloseMs, interval);
    try {
      const candles = await fetchCandles(hlCoin, interval, startMs, endMs);
      if (candles.length >= 2) {
        return candles;
      }
    } catch (error) {
      console.warn(`  [warn] ${hlCoin} ${interval}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return [];
}

function scoreAtCheckpoint(
  openPrice: number | null,
  candles: Array<{ t: number; c: string }>,
  checkpointMs: number,
): number {
  if (openPrice == null || openPrice <= 0) return 0;
  const price = resolvePriceAtTimestamp(candles, checkpointMs);
  if (price == null || price <= 0) return 0;
  const pctReturn = ((price - openPrice) / openPrice) * 100;
  return pctReturnToLineupPoints(pctReturn, 1);
}

function recentWeekKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let offset = 1; offset <= count + 2; offset += 1) {
    const d = new Date(now.getTime() - offset * 7 * 24 * 60 * 60 * 1000);
    const weekYear = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric" }).format(d),
    );
    // Use ISO week via date-fns approach — walk back by completed weeks
    const ref = new Date(d);
    const jan4 = new Date(Date.UTC(ref.getUTCFullYear(), 0, 4, 12));
    // simpler: derive from resolveWeekAnchorDates on current week minus offset
    keys.push(formatCommoditiesWeekExternalId(weekYear, getApproxIsoWeek(d)));
  }
  // Deduplicate and take most recent `count` unique weeks
  const unique = [...new Set(keys)];
  return unique.slice(0, count);
}

function getApproxIsoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function countDecreases(scores: number[]): number {
  let decreases = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i]! < scores[i - 1]!) decreases += 1;
  }
  return decreases;
}

async function analyzeWeek(weekKey: string, field: Awaited<ReturnType<typeof buildFieldSnapshot>>) {
  const bounds = resolveWeeklySessionBounds(weekKey);
  const sessionOpenMs = new Date(bounds.sessionOpen).getTime();
  const sessionCloseMs = new Date(bounds.sessionClose).getTime();
  const checkpoints = buildCheckpoints(sessionOpenMs, sessionCloseMs);
  const { monday, friday } = resolveWeekAnchorDates(weekKey);

  console.log(`\n${"=".repeat(72)}`);
  console.log(`Week ${weekKey}  (${monday} → ${friday})`);
  console.log(`Session: ${bounds.sessionOpen} → ${bounds.sessionClose}`);

  const tickerData = new Map<
    string,
    { displayName: string; openPrice: number | null; candles: Array<{ t: number; c: string }>; finals: number }
  >();

  for (const entry of field) {
    const candles = await fetchSessionCandles(entry.hlCoin, sessionOpenMs, sessionCloseMs);
    const openPrice = resolvePriceAtTimestamp(candles, sessionOpenMs);
    const finalScore = scoreAtCheckpoint(openPrice, candles, sessionCloseMs);
    tickerData.set(entry.ticker, {
      displayName: entry.displayName,
      openPrice,
      candles,
      finals: finalScore,
    });
  }

  // Per-commodity final returns
  console.log("\nFinal commodity scores (Mon open → Fri close):");
  const sortedFinals = [...tickerData.entries()].sort((a, b) => b[1].finals - a[1].finals);
  for (const [ticker, data] of sortedFinals) {
    const display = String(Math.round(data.finals));
    const sign = data.finals >= 0 ? "+" : "";
    console.log(`  ${data.displayName.padEnd(14)} ${ticker.padEnd(10)} ${sign}${display}`);
  }

  const allFinals = sortedFinals.map(([, d]) => d.finals);
  const spread =
    allFinals.length > 0 ? Math.max(...allFinals) - Math.min(...allFinals) : 0;
  console.log(
    `\nField spread (best − worst pick): ${Math.round(spread)} pts`,
  );

  // Lineup trajectories
  console.log("\nLineup score trajectories (display pts):");
  const lineupFinals: Array<{ name: string; final: number; decreases: number; scores: number[] }> =
    [];

  for (const lineup of LINEUPS) {
    const scores = checkpoints.map((cp) => {
      let total = 0;
      for (const ticker of lineup.tickers) {
        const data = tickerData.get(ticker);
        if (!data) continue;
        total += scoreAtCheckpoint(data.openPrice, data.candles, cp.ms);
      }
      return total;
    });

    const decreases = countDecreases(scores);
    lineupFinals.push({ name: lineup.name, final: scores[scores.length - 1] ?? 0, decreases, scores });

    const trajectory = checkpoints
      .map((cp, i) => `${cp.label}=${scores[i] ?? 0}`)
      .join(" → ");
    console.log(`  ${lineup.name.padEnd(18)} ${trajectory}`);
    console.log(
      `  ${"".padEnd(18)} ↳ ${decreases} score drop(s) between checkpoints; final=${scores[scores.length - 1] ?? 0}`,
    );
  }

  lineupFinals.sort((a, b) => b.final - a.final);
  const winner = lineupFinals[0]?.final ?? 0;
  const runnerUp = lineupFinals[1]?.final ?? 0;
  console.log(
    `\nLineup spread (1st − 2nd): ${Math.round(winner - runnerUp)} pts`,
  );

  return {
    weekKey,
    fieldSpread: spread,
    lineupSpread: winner - runnerUp,
    lineupFinals,
    allFinals,
  };
}

async function main(): Promise<void> {
  const weekCount = Number.parseInt(process.argv[2] ?? "5", 10);
  const catalog = await buildCommodityCatalog();
  const field = buildFieldSnapshot(catalog);

  if (field.length === 0) {
    throw new Error("No liquid commodities resolved from Hyperliquid catalog");
  }

  console.log(`\nCommodities weekly lineup analysis (${field.length} tickers, live HL data)`);
  console.log(`Scoring: sum of 3 picks × (pctReturn × 10), rounded to lineup points`);
  console.log(`Lineups: ${LINEUPS.map((l) => l.name).join(", ")}`);

  // Walk back completed ISO weeks reliably
  const keys: string[] = [];
  let probe = new Date();
  while (keys.length < weekCount) {
    probe = new Date(probe.getTime() - 7 * 24 * 60 * 60 * 1000);
    const y = probe.getUTCFullYear();
    const w = getApproxIsoWeek(probe);
    const key = formatCommoditiesWeekExternalId(y, w);
    if (!keys.includes(key)) keys.push(key);
  }

  const summaries = [];
  for (const weekKey of keys) {
    summaries.push(await analyzeWeek(weekKey, field));
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("CROSS-WEEK SUMMARY\n");

  const avgFieldSpread =
    summaries.reduce((s, w) => s + w.fieldSpread, 0) / summaries.length;
  const avgLineupSpread =
    summaries.reduce((s, w) => s + w.lineupSpread, 0) / summaries.length;
  const avgFinalLineup =
    summaries.reduce((s, w) => {
      const finals = w.lineupFinals.map((l) => l.final);
      return s + finals.reduce((a, b) => a + b, 0) / finals.length;
    }, 0) / summaries.length;
  const avgDecreases =
    summaries.reduce((s, w) => {
      const drops = w.lineupFinals.reduce((a, l) => a + l.decreases, 0);
      return s + drops / w.lineupFinals.length;
    }, 0) / summaries.length;

  console.log(`Weeks analyzed: ${summaries.length}`);
  console.log(`Avg field spread (best−worst commodity): ${Math.round(avgFieldSpread)} pts`);
  console.log(`Avg lineup spread (1st−2nd): ${Math.round(avgLineupSpread)} pts`);
  console.log(`Avg lineup final score: ${Math.round(avgFinalLineup)} pts`);
  console.log(`Avg score drops per lineup per week: ${avgDecreases.toFixed(1)}`);

  console.log("\nWeekly lineup winners:");
  for (const w of summaries) {
    const sorted = [...w.lineupFinals].sort((a, b) => b.final - a.final);
    const top = sorted[0];
    console.log(
      `  ${w.weekKey}: ${top?.name ?? "?"} (${Math.round(top?.final ?? 0)}) — spread vs 2nd: ${Math.round(w.lineupSpread)}`,
    );
  }

  // Distribution of individual commodity weekly returns
  const allReturns = summaries.flatMap((w) => w.allFinals);
  const positive = allReturns.filter((r) => r > 0).length;
  const negative = allReturns.filter((r) => r < 0).length;
  const zero = allReturns.filter((r) => r === 0).length;
  console.log(
    `\nCommodity-week observations: ${positive} positive, ${negative} negative, ${zero} zero/DNP (${allReturns.length} total)`,
  );

  const absScores = allReturns.map(Math.abs);
  const medianAbs =
    absScores.sort((a, b) => a - b)[Math.floor(absScores.length / 2)] ?? 0;
  console.log(`Median |commodity weekly score|: ${Math.round(medianAbs)} pts`);

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
