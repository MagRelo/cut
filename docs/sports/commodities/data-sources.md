# Commodities data sources

## Live source (production)

| Layer | Provider |
|-------|----------|
| **Prices** | [Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint) HIP-3 perps |
| **Deployer** | Multi-dex dedup with **trade.xyz (`xyz`) preferred** |
| **Auth** | None (public `info` API) |

### Endpoints

- `perpDexs` — catalog resolution at init
- `metaAndAssetCtxs` — live `markPx`, 24h `prevDayPx`, volume
- `candleSnapshot` — session-boundary open/close prices, sparklines

### Catalog

Static 8-ticker allowlist in `packages/sport-commodities/src/catalog.ts` (`CL`, `BRENTOIL`, `NATGAS`, `GOLD`, `SILVER`, `PLATINUM`, `PALLADIUM`, `COPPER`). `Participant.externalId` = canonical ticker. Init resolves Hyperliquid `hlCoin` per ticker and filters to liquid markets. `metadata.commodities.fieldSnapshot` freezes the resolved field at init.

### Scoring

Five daily legs (Mon–Fri), each scored close-to-close with asymmetric loss weighting (`lossRatio` 0.4). Production path:

1. `marketDataProvider` fetches session candles/marks → `SessionPriceSnapshot`
2. `mergeLockedDayClosePrices` keeps settled day closes stable on re-sync
3. `transformCommodityDailyPrice` in `@cut/sport-commodities` writes `EventParticipant.total` and `scoreData` (`r1`…`r5`)

Week open price locks after first LIVE sync. `sessionStarted` / `sessionComplete` are set by cron (not client wall clock). Missing price for a leg → 0 pts (DNP).

---

## Development / CI

| Mode | When |
|------|------|
| **Fixture** | `COMMODITIES_USE_FIXTURE_PRICES=true` — deterministic prices in `fixtureMarketData.ts` |

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `HYPERLIQUID_INFO_URL` | `https://api.hyperliquid.xyz/info` | API base |
| `COMMODITIES_USE_FIXTURE_PRICES` | unset (live) | Force fixture mode |
| `COMMODITIES_HL_CATALOG_TTL_MS` | `3600000` | Catalog cache TTL |
| `COMMODITIES_HL_MARK_CACHE_MS` | `45000` | Mark quote cache |
| `COMMODITIES_SESSION_TZ` | `America/New_York` | Default TZ when init omits session flags |
| `COMMODITIES_SESSION_OPEN` | `09:30` | Default open when init omits `--open` |
| `COMMODITIES_SESSION_CLOSE` | `16:30` | Default Friday close when init omits `--close` |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `service:sync-commodities-metadata` | Manual metadata sync (active event or pass `eventId`) |
| `service:sync-commodities-field` | Manual field + quotes + sparkline sync |
| `service:sync-commodities-scores` | Manual live score sync (LIVE events only) |
| `script:commodities-catalog-sync` | Print allowlist vs HL availability |
| `script:commodities-data-spike` | Session-boundary returns (`--live` for HL) |
| `script:commodities-dry-run` | End-to-end contest ranking (fixture) |
| `script:commodities-local-eval` | Enable sport, init event, open eval contest |
| `script:commodities-cleanup-local` | Remove commodities events/contests from local DB |
