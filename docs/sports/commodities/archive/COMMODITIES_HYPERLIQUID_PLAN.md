--- Historical — superseded by [competition-brief.md](../competition-brief.md) and [event-activation-runbook.md](../event-activation-runbook.md). ---
# Commodity Picks — Hyperliquid integration

**Status:** Implemented.

**Related:** [competition brief](docs/sports/commodities/competition-brief.md) · [data sources](docs/sports/commodities/data-sources.md) · [COMMODITIES_JOURNAL.md](COMMODITIES_JOURNAL.md)

---

## Summary

Commodity Picks uses **Hyperliquid HIP-3 perpetual futures** as the live price source. Scoring is `% return` between `metadata.commodities.sessionOpen` and `sessionClose` (arbitrary ISO windows). The catalog is a **static allowlist** (~14 commodities) resolved to `hlCoin` at init via the HL `perpDexs` API (multi-dex dedup, xyz preferred). Each event freezes `metadata.commodities.fieldSnapshot` so markets never swap mid-contest.

Fixture mode (`COMMODITIES_USE_FIXTURE_PRICES=true`) supports offline dev/CI.

---

## Key files

| Area | Path |
|------|------|
| Allowlist + types | `packages/sport-commodities/src/catalog.ts` |
| HL client | `server/src/sports/commodities/hyperliquidClient.ts` |
| Catalog builder | `server/src/sports/commodities/hyperliquidCatalog.ts` |
| Session pricing | `server/src/sports/commodities/sessionPricing.ts` |
| Provider | `server/src/sports/commodities/marketDataProvider.ts` |
| Scoring sync | `server/src/sports/commodities/syncLiveScores.ts` |

---

## Operator commands

```bash
# Print resolved HL catalog
pnpm --filter server run script:commodities-catalog-sync

# Init event (resolves HL coins + freezes field)
pnpm run service:init-event commodities 2026-06-30 --open +30m --close +2h

# Fixture spike / dry-run
COMMODITIES_USE_FIXTURE_PRICES=true pnpm --filter server run script:commodities-data-spike 2025-06-27
pnpm --filter server run script:commodities-dry-run 2025-06-27
```

---

## API endpoints used

| Endpoint | Purpose |
|----------|---------|
| `{ type: "perpDexs" }` | Resolve `hlCoin` per allowlist ticker at init |
| `{ type: "metaAndAssetCtxs", dex }` | Live marks for quotes + current price |
| `{ type: "candleSnapshot", req }` | Session open/close prices + sparklines |

No API key required.
