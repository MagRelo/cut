# Commodities data sources

**Status:** Stage 2 spike complete. Primary source chosen for v1 implementation.

**Related:** [competition-brief.md](competition-brief.md) · [event-activation-runbook.md](event-activation-runbook.md)

---

## Decision

| Role | Source | Base URL |
|------|--------|----------|
| **Primary (v1)** | Yahoo Finance (unofficial JSON API) | `https://query1.finance.yahoo.com` |
| **Auth (v1)** | None | — |

**Rationale:** Yahoo exposes CME-style futures symbols (`CL=F`, `GC=F`, etc.) via quote and chart endpoints without an API key. Five-minute cron batches 24 symbols with light throttling (120ms between chart calls). Historical dry-runs use the daily chart bar for the session date.

---

## Endpoints

| Endpoint | Use |
|----------|-----|
| `GET /v7/finance/quote?symbols=…` | Batch live/open/current prices during session |
| `GET /v8/finance/chart/{symbol}?interval=1d&period1=…&period2=…` | Historical daily OHLC for spike and COMPLETE sync |

---

## Field mapping

| Yahoo field | Platform field |
|-------------|----------------|
| Symbol (e.g. `CL=F`) | `Participant.metadata.yahooSymbol` |
| Symbol sans `=F` | `Participant.externalId` |
| `regularMarketOpen` / daily `open` | `scoreData.openPrice` |
| `regularMarketPrice` / daily `close` | `scoreData.currentPrice` / `closePrice` |
| Computed % return | `scoreData.pctReturn`, `EventParticipant.total` (fixed-point ×10) |

---

## externalId resolution

**Pattern:** ISO calendar date `YYYY-MM-DD` — e.g. `2026-06-29`.

Session open/close are derived from env (default 9:30–16:00 America/New_York) and stored in `metadata.commodities`.

---

## Rate limits

No published limit. Implement 429 retry with linear backoff (500ms × attempt). Spike uses 120ms delay between per-symbol chart fetches.

---

## Symbol coverage notes

All 24 catalog symbols must return a daily bar for the dry-run date. Thin symbols (Lead `LED=F`, Zinc `ZNC=F`, Nickel `NI=F`) are validated in `script:commodities-data-spike`. Substitute per catalog comments if Yahoo drops a contract.

---

## Env vars

| Variable | Default |
|----------|---------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` |
| `COMMODITIES_SESSION_OPEN` | `09:30` |
| `COMMODITIES_SESSION_CLOSE` | `16:00` |
| `YAHOO_FINANCE_BASE_URL` | `https://query1.finance.yahoo.com` |
