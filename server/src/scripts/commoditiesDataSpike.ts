/**
 * Validate fixture or live HL scoring for catalog symbols on a session window.
 * Usage:
 *   pnpm --filter server run script:commodities-data-spike 2026-W27
 *   pnpm --filter server run script:commodities-data-spike 2026-W27 --live
 */

import "dotenv/config";
import {
  COMMODITY_METADATA_ALLOWLIST,
  transformCommodityDailyPrice,
  catalogEntryToFieldEntry,
  asymmetricPctToTotal,
} from "@cut/sport-commodities";
import { buildCommodityCatalog, buildFieldSnapshot } from "../sports/commodities/hyperliquidCatalog.js";
import { parseCommoditiesSessionExternalId } from "../sports/commodities/externalId.js";
import { getSessionPricesForField } from "../sports/commodities/marketDataProvider.js";
import {
  formatSessionDisplayName,
  resolveWeeklySessionBounds,
} from "../sports/commodities/sessionConfig.js";
import { commoditiesCurrentRound } from "../sports/commodities/sessionRounds.js";

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

  const currentRound = commoditiesCurrentRound(bounds.sessionOpen, bounds.sessionClose);

  const prices = await getSessionPricesForField({
    field,
    sessionOpen: bounds.sessionOpen,
    sessionClose: bounds.sessionClose,
    isComplete: true,
    existingScoresByTicker: new Map(),
  });

  for (const entry of field) {
    const snapshot = prices.get(entry.ticker);
    const payload = transformCommodityDailyPrice({
      openPrice: snapshot?.openPrice ?? null,
      dayClosePrices: snapshot?.dayClosePrices ?? [],
      currentPrice: snapshot?.closePrice ?? snapshot?.currentPrice ?? null,
      closePrice: snapshot?.closePrice ?? null,
      isComplete: true,
      currentRound,
      provisional: false,
    });

    const display = String(payload.total);
    const rounds = [payload.scoreData.r1, payload.scoreData.r2, payload.scoreData.r3, payload.scoreData.r4, payload.scoreData.r5]
      .map((round) => String(round?.total ?? 0))
      .join("/");
    console.log(
      `  ${entry.displayName.padEnd(14)} ${entry.ticker.padEnd(10)} total=${display} rounds=${rounds}`,
    );
  }

  const samplePct = 2.35;
  console.log(
    `\nScoring sanity: +${samplePct}% day → ${asymmetricPctToTotal(samplePct)} pts`,
  );
  console.log(
    `Scoring sanity: -${samplePct}% day → ${asymmetricPctToTotal(-samplePct)} pts`,
  );
  console.log("\nSpike OK.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
