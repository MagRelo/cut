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

Static allowlist in `packages/sport-commodities/src/catalog.ts` (~14 tickers: `GOLD`, `CL`, `BRENTOIL`, etc.). `Participant.externalId` = canonical ticker. `metadata.commodities.fieldSnapshot` freezes `hlCoin` per event at init.

### Scoring

`% return` = mark/candle at `sessionOpen` → current mark (LIVE) → mark/candle at `sessionClose`. Open price locks after first LIVE sync. `sessionStarted` / `sessionComplete` are set by cron (not client wall clock). Missing price → 0 pts (DNP).

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
| `COMMODITIES_SESSION_CLOSE` | `16:00` | Default close when init omits `--close` |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `script:commodities-catalog-sync` | Print allowlist vs HL availability |
| `script:commodities-data-spike` | Session-boundary returns (`--live` for HL) |
| `script:commodities-dry-run` | End-to-end contest ranking (fixture) |
| `script:commodities-local-eval` | Enable sport, init event, open eval contest |
| `script:commodities-cleanup-local` | Remove commodities events/contests from local DB |
