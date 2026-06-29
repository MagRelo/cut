# F1 data sources

**Status:** Stage 2 spike complete. Primary source chosen for v1 implementation.

**Related:** [competition-brief.md](competition-brief.md) · [event-activation-runbook.md](event-activation-runbook.md)

---

## Decision

| Role | Source | Base URL |
|------|--------|----------|
| **Primary (v1)** | OpenF1 | `https://api.openf1.org/v1` |
| **Schedule / round lookup** | Jolpica (Ergast-compatible) | `https://api.jolpi.ca/ergast/f1` |
| **Auth (v1)** | None for historical data | — |

**Rationale:** OpenF1 covers 2023+ with drivers, session metadata, live positions, and `session_result` rows that include **points with fastest-lap bonus already applied** (verified against 2024 British GP — Sainz P5 = 11 pts). Historical access is free with no API key. Jolpica supplies season round numbers for driver standings when matched by race date.

During a **live F1 session** (practice, qualifying, or race), OpenF1 restricts **all** API access — including historical sessions — to authenticated users until that session ends. Outside live weekends, historical replay and post-race sync work without auth (e.g. dry-run on session_key `9558`). Production live races need `OPENF1_API_TOKEN`.

---

## Candidate evaluation

| Source | Schedule | Entry list | Live positions | Final results + points | Auth | License |
|--------|----------|------------|----------------|------------------------|------|---------|
| **OpenF1** | Yes (`/meetings`, `/sessions`) | Yes (`/drivers`) | Yes (`/position`, ~4s during live) | Yes (`/session_result`) | Free historical; paid live | Open source ([MIT](https://github.com/br-g/openf1)); check terms for commercial use |
| **Jolpica (Ergast)** | Yes (`/seasons`, `/races`) | Yes (`/drivers`) | No | Yes (`/results`) — points without FL bonus in raw `points` field; `FastestLap.rank` separate | None | Open source |
| **Official F1 API** | Unknown | Unknown | Unknown | Unknown | Commercial | Not evaluated in spike |

---

## Rate limits (OpenF1)

| Tier | Limit |
|------|-------|
| Free (historical) | 3 req/s, 30 req/min |
| Paid (live) | Higher limits; MQTT/WebSocket available |

Implement exponential backoff on HTTP 429. Five-minute cron is well within free-tier limits for ~20 drivers per sync pass.

---

## externalId resolution

**Pattern:** OpenF1 Race `session_key` as a plain numeric string — e.g. `9558` (2024 British GP).

Golf uses PGA Tour IDs (`R2026033`); F1 uses OpenF1 session keys. Sports can differ — the platform stores whatever the sport plugin resolves.

**Operator lookup:**

```bash
pnpm --filter server run script:f1-list-races 2026
```

**Resolution flow at `initEvent`:**

1. Parse `externalId` as positive integer `session_key`.
2. **OpenF1:** `GET /sessions?session_key={key}` — validate `session_type` / `session_name` is Race.
3. **Jolpica:** `GET /{year}.json` — match race by UTC calendar date on `date_start` (for round number and `circuitId`).
4. Persist on `CompetitionEvent.metadata`:

```json
{
  "f1": {
    "season": 2024,
    "round": 12,
    "meetingKey": 1240,
    "sessionKey": 9558,
    "circuitId": "silverstone",
    "raceName": "British Grand Prix",
    "raceStart": "2024-07-07T14:00:00+00:00",
    "raceEnd": "2024-07-07T16:00:00+00:00"
  }
}
```

**Init command:**

```bash
pnpm --filter server run service:init-event f1 9558
```

---

## API → platform field mapping

### Field sync (`syncParticipantField`)

| OpenF1 `/drivers` | Platform |
|-------------------|----------|
| `driver_number` | `Participant.externalId` (stable per season) |
| `full_name` | `Participant.displayName` |
| `driver_number` + session | `EventParticipant` row |
| `team_name`, `team_colour`, `headshot_url`, `country_code` | `EventParticipant.metadata` / `Participant.metadata` |

Use Jolpica `driverId` (e.g. `hamilton`) as secondary key if needed for cross-source joins.

### Live scores (`syncLiveScores`)

**During LIVE:** `GET /position?session_key={key}` — take latest position per `driver_number` by max `date`. Compute **provisional** points from position using brief scoring table (no fastest-lap bonus until final).

**At COMPLETE:** `GET /session_result?session_key={key}` — use `position`, `points`, `dnf`, `dns`, `dsq` directly. `points` includes fastest-lap bonus.

| OpenF1 `session_result` | `EventParticipant` |
|-------------------------|-------------------|
| `points` | `total` |
| `position`, `dnf`, `dns`, `dsq`, `number_of_laps` | `scoreData` |

### Event status

| Status | Trigger |
|--------|---------|
| `SCHEDULED` | Before `sessions.date_start` |
| `LIVE` | `date_start` ≤ now < official classification (session ended + `session_result` available) |
| `COMPLETE` | `session_result` published (non-empty, final) |

---

## Verified spike: session_key `9558` (2024 British GP)

| Field | Value |
|-------|-------|
| externalId | `9558` |
| Jolpica season/round | 2024 / 12 |
| OpenF1 `meeting_key` | 1240 |
| OpenF1 race `session_key` | 9558 |
| Race start | 2024-07-07T14:00:00Z |
| Winner | Hamilton (44) — 25 pts |
| Fastest-lap bonus check | Sainz P5 — 11 pts in `session_result` (10 + 1) |

Run spike locally:

```bash
pnpm --filter server run script:f1-list-races 2024
pnpm --filter server run script:f1-data-spike 9558
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENF1_API_TOKEN` | No (off weekends) | Required while any F1 session is live — OpenF1 blocks unauthenticated access globally until it ends |
| `JOLPICA_BASE_URL` | No | Default `https://api.jolpi.ca/ergast/f1` |

No secrets required for historical dry-run.

---

## Known gaps

- **Provisional vs final points** during LIVE — position-based estimate until `session_result` lands; UI should label provisional scores.
- **Live window auth** — production live races need OpenF1 subscription evaluation before first live GP.
- **Jolpica `points` field** does not include fastest-lap bonus — prefer OpenF1 `session_result.points` for finals.
