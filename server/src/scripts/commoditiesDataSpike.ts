/**
 * Validate fixture or live HL scoring for catalog symbols on a session window.
 * Usage:
 *   pnpm --filter server run script:commodities-data-spike 2026-W27
 *   pnpm --filter server run script:commodities-data-spike 2026-W27 --live
 */

import "dotenv/config";
import {
  COMMODITY_METADATA_ALLOWLIST,
  transformCommodityPrice,
  pctReturnToTotal,
  catalogEntryToFieldEntry,
} from "@cut/sport-commodities";
import { buildCommodityCatalog, buildFieldSnapshot } from "../sports/commodities/hyperliquidCatalog.js";
import { parseCommoditiesSessionExternalId } from "../sports/commodities/externalId.js";
import { getSessionPricesForField } from "../sports/commodities/marketDataProvider.js";
import {
  formatSessionDisplayName,
  resolveWeeklySessionBounds,
} from "../sports/commodities/sessionConfig.js";

function fixtureFieldSnapshot() {
  return COMMODITY_METADATA_ALLOWLIST.map((entry) =>
    catalogEntryToFieldEntry({
      ...entry,
      hlCoin: `xyz:${entry.ticker}`,
      hlDex: "xyz",
    }),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const live = args.includes("--live");
  process.env.COMMODITIES_USE_FIXTURE_PRICES = live ? "false" : "true";

  const externalId = args.find((arg) => !arg.startsWith("--")) ?? "2026-W27";
  const sessionWeek = parseCommoditiesSessionExternalId(externalId);
  const bounds = resolveWeeklySessionBounds(sessionWeek);

  const field = live
    ? buildFieldSnapshot(await buildCommodityCatalog())
    : fixtureFieldSnapshot();

  console.log(`\n=== Commodities data spike: ${sessionWeek} (${live ? "live HL" : "fixture"}) ===\n`);
  console.log(`Event name: ${formatSessionDisplayName(sessionWeek)}`);
  console.log(`Session open:  ${bounds.sessionOpen}`);
  console.log(`Session close: ${bounds.sessionClose}`);
  console.log(`Field size: ${field.length}\n`);

  const prices = await getSessionPricesForField({
    field,
    sessionOpen: bounds.sessionOpen,
    sessionClose: bounds.sessionClose,
    isComplete: true,
    existingScoresByTicker: new Map(),
  });

  for (const entry of field) {
    const snapshot = prices.get(entry.ticker);
    const payload = transformCommodityPrice({
      openPrice: snapshot?.openPrice ?? null,
      currentPrice: snapshot?.closePrice ?? snapshot?.currentPrice ?? null,
      closePrice: snapshot?.closePrice ?? null,
      provisional: false,
    });

    const display = (payload.total / 10).toFixed(1);
    const pct = payload.scoreData.pctReturn ?? 0;
    console.log(
      `  ${entry.displayName.padEnd(14)} ${entry.ticker.padEnd(10)} ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% → ${display}`,
    );
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
