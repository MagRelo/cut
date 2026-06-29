/**
 * Fetch session bounds and daily prices for all catalog symbols.
 * Usage: pnpm --filter server run script:commodities-data-spike 2025-06-27
 */

import "dotenv/config";
import { transformCommodityPrice, pctReturnToTotal } from "@cut/sport-commodities";
import { COMMODITY_CATALOG } from "../sports/commodities/commodityCatalog.js";
import { parseCommoditiesSessionExternalId } from "../sports/commodities/externalId.js";
import {
  fetchYahooDailyBars,
  fetchYahooQuotes,
} from "../sports/commodities/yahooFinanceClient.js";
import {
  formatSessionDisplayName,
  resolveSessionBounds,
} from "../sports/commodities/sessionConfig.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const useFixture = args.includes("--fixture");
  const externalId = args.find((arg) => !arg.startsWith("--")) ?? "2025-06-27";

  if (useFixture) {
    process.env.COMMODITIES_USE_FIXTURE_PRICES = "true";
    console.log("(Fixture mode — set COMMODITIES_USE_FIXTURE_PRICES=true)\n");
  }
  const sessionDate = parseCommoditiesSessionExternalId(externalId);
  const bounds = resolveSessionBounds(sessionDate);
  const symbols = COMMODITY_CATALOG.map((entry) => entry.yahooSymbol);

  console.log(`\n=== Commodities data spike: ${sessionDate} ===\n`);
  console.log(`Event name: ${formatSessionDisplayName(sessionDate)}`);
  console.log(`Session open:  ${bounds.sessionOpen}`);
  console.log(`Session close: ${bounds.sessionClose}`);
  console.log(`Catalog size: ${symbols.length}\n`);

  const dailyBars = await fetchYahooDailyBars(symbols, sessionDate);
  let liveQuotes: Awaited<ReturnType<typeof fetchYahooQuotes>> = [];
  try {
    liveQuotes = await fetchYahooQuotes(symbols.slice(0, 3));
  } catch {
    console.log("(Skipping live quote sample — daily bars are sufficient for spike)");
  }

  const quoteBySymbol = new Map(liveQuotes.map((q) => [q.symbol, q]));
  const missing: string[] = [];
  const rows: Array<{
    name: string;
    symbol: string;
    open: number;
    close: number;
    pct: number;
    total: number;
  }> = [];

  for (const entry of COMMODITY_CATALOG) {
    const bar = dailyBars.get(entry.yahooSymbol);
    const quote = quoteBySymbol.get(entry.yahooSymbol);

    if (!bar) {
      missing.push(`${entry.displayName} (${entry.yahooSymbol})`);
      continue;
    }

    const payload = transformCommodityPrice({
      openPrice: bar.open,
      currentPrice: bar.close,
      closePrice: bar.close,
      provisional: false,
    });

    rows.push({
      name: entry.displayName,
      symbol: entry.yahooSymbol,
      open: bar.open,
      close: bar.close,
      pct: payload.scoreData.pctReturn ?? 0,
      total: payload.total,
    });

    if (!quote) {
      console.warn(`  [warn] No live quote for ${entry.yahooSymbol} (daily bar OK)`);
    }
  }

  console.log("Daily returns (historical bar):");
  for (const row of rows.sort((a, b) => b.total - a.total)) {
    const display = (row.total / 10).toFixed(1);
    console.log(
      `  ${row.name.padEnd(14)} ${row.symbol.padEnd(8)} ${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(2)}% → ${display} (total=${row.total})`,
    );
  }

  if (missing.length > 0) {
    console.log(`\nMissing daily bars (${missing.length}):`);
    for (const label of missing) {
      console.log(`  - ${label}`);
    }
    process.exit(1);
  }

  const samplePct = 2.35;
  console.log(`\nScoring sanity: +${samplePct}% → total=${pctReturnToTotal(samplePct)} (display ${(pctReturnToTotal(samplePct) / 10).toFixed(1)})`);
  console.log("\nSpike OK.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
