/**
 * Print deduped HL commodity catalog vs static allowlist, with health status.
 * Usage: pnpm --filter server run script:commodities-catalog-sync
 */

import "dotenv/config";
import { COMMODITY_METADATA_ALLOWLIST } from "@cut/sport-commodities";
import { buildCommodityCatalog } from "../sports/commodities/hyperliquidCatalog.js";
import { assessMarketHealth } from "../sports/commodities/marketHealth.js";
import { fetchAssetContexts } from "../sports/commodities/hyperliquidClient.js";

async function main(): Promise<void> {
  const catalog = await buildCommodityCatalog();
  const resolved = new Set(catalog.map((entry) => entry.ticker));

  const dexes = [...new Set(catalog.map((entry) => entry.hlDex))];
  const contextMap = new Map<string, Awaited<ReturnType<typeof fetchAssetContexts>>[number]>();
  for (const dex of dexes) {
    const assets = await fetchAssetContexts(dex);
    for (const asset of assets) {
      contextMap.set(asset.hlCoin, asset);
    }
  }

  console.log("\n=== Commodities HL catalog sync ===\n");
  console.log(`Allowlist: ${COMMODITY_METADATA_ALLOWLIST.length}`);
  console.log(`Resolved:  ${catalog.length}\n`);

  let healthyCount = 0;
  for (const entry of catalog) {
    const asset = contextMap.get(entry.hlCoin);
    const health = asset
      ? await assessMarketHealth(asset, entry.hlCoin)
      : { healthy: false, reason: "no_asset_context" };
    if (health.healthy) {
      healthyCount += 1;
    }
    const status = health.healthy ? "healthy" : `excluded (${health.reason})`;
    console.log(
      `  ${entry.ticker.padEnd(10)} ${entry.hlCoin.padEnd(16)} ${entry.displayName.padEnd(14)} ${status}`,
    );
  }

  console.log(`\nHealthy:   ${healthyCount}/${catalog.length} (used at init)`);

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
