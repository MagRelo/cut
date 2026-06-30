/**
 * Validate fixture scoring for all catalog symbols on a session date.
 * Usage: pnpm --filter server run script:commodities-data-spike 2025-06-27
 */

import "dotenv/config";
import { transformCommodityPrice, pctReturnToTotal } from "@cut/sport-commodities";
import { COMMODITY_CATALOG } from "../sports/commodities/commodityCatalog.js";
import { parseCommoditiesSessionExternalId } from "../sports/commodities/externalId.js";
import { getFixtureDailyBars } from "../sports/commodities/fixtureMarketData.js";
import {
  formatSessionDisplayName,
  resolveSessionBounds,
} from "../sports/commodities/sessionConfig.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const externalId = args.find((arg) => !arg.startsWith("--")) ?? "2025-06-27";
  const sessionDate = parseCommoditiesSessionExternalId(externalId);
  const bounds = resolveSessionBounds(sessionDate);
  const symbols = COMMODITY_CATALOG.map((entry) => entry.symbol);

  console.log(`\n=== Commodities fixture spike: ${sessionDate} ===\n`);
  console.log(`Event name: ${formatSessionDisplayName(sessionDate)}`);
  console.log(`Session open:  ${bounds.sessionOpen}`);
  console.log(`Session close: ${bounds.sessionClose}`);
  console.log(`Catalog size: ${symbols.length}\n`);

  const dailyBars = getFixtureDailyBars(symbols, sessionDate);
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
    const bar = dailyBars.get(entry.symbol);
    if (!bar) {
      missing.push(`${entry.displayName} (${entry.symbol})`);
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
      symbol: entry.symbol,
      open: bar.open,
      close: bar.close,
      pct: payload.scoreData.pctReturn ?? 0,
      total: payload.total,
    });
  }

  console.log("Daily returns (fixture):");
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
  console.log(
    `\nScoring sanity: +${samplePct}% → total=${pctReturnToTotal(samplePct)} (display ${(pctReturnToTotal(samplePct) / 10).toFixed(1)})`,
  );
  console.log("\nSpike OK.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
