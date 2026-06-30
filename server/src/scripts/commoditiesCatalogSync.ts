/**
 * Print deduped HL commodity catalog vs static allowlist.
 * Usage: pnpm --filter server run script:commodities-catalog-sync
 */

import "dotenv/config";
import { COMMODITY_METADATA_ALLOWLIST } from "@cut/sport-commodities";
import { buildCommodityCatalog } from "../sports/commodities/hyperliquidCatalog.js";

async function main(): Promise<void> {
  const catalog = await buildCommodityCatalog();
  const resolved = new Set(catalog.map((entry) => entry.ticker));

  console.log("\n=== Commodities HL catalog sync ===\n");
  console.log(`Allowlist: ${COMMODITY_METADATA_ALLOWLIST.length}`);
  console.log(`Resolved:  ${catalog.length}\n`);

  for (const entry of catalog) {
    console.log(`  ${entry.ticker.padEnd(10)} ${entry.hlCoin.padEnd(16)} ${entry.displayName}`);
  }

  const missing = COMMODITY_METADATA_ALLOWLIST.filter((entry) => !resolved.has(entry.ticker));
  if (missing.length > 0) {
    console.log(`\nMissing on HL (${missing.length}):`);
    for (const entry of missing) {
      console.log(`  - ${entry.ticker} (${entry.displayName})`);
    }
  } else {
    console.log("\nAll allowlist entries resolved on HL.");
  }

  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
