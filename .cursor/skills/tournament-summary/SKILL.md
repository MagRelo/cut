---
name: tournament-summary
description: >-
  Research and write PGA Tour tournament preview JSON for Play The Cut.
  Use when the user provides a pgaTourId (e.g. R2026023), asks for a
  tournament summary, Perplexity-style preview, or updates
  server/src/tournamentSummaries/*.json.
---

# Tournament Summary Generator

Produce Perplexity-style preview content for a PGA Tour event and save it to
`server/src/tournamentSummaries/{pgaTourId}.json`.

## Quick prompt (user copy-paste)

```
Generate a tournament summary for R2026023
```

Replace the ID with any `pgaTourId`. Optional flags:

- `write file` — save JSON (default)
- `preview only` — show JSON in chat, do not write
- `recap` — post-tournament results instead of pre-event preview

## Workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Resolve tournament from pgaTourId
- [ ] Step 2: Web research (5–10 sources; see source table below)
- [ ] Step 3: Draft JSON in canonical format
- [ ] Step 4: Validate JSON
- [ ] Step 5: Write file (unless preview only)
```

### Step 1: Resolve tournament

1. Confirm ID format: `R` + year + event number (e.g. `R2026023`).
2. Open PGA Tour overview:
   `https://www.pgatour.com/tournaments/2026/overview/{pgaTourId}`
   or search: `PGA Tour {pgaTourId} overview`.
3. Note: official name, venue, city/state, dates, purse, FedExCup points,
   field size, par, yardage, event type (Signature, major, etc.).
4. Check whether the event is **upcoming** or **already finished** (compare
   dates to today). Default output is a **pre-tournament preview** unless
   the user asked for a recap.

### Step 2: Web research

Use web search and fetch pages directly when helpful. **Check 5–10 different
sources** before drafting — wider coverage produces sharper storylines, odds
context, and course notes. Cross-check facts across at least two sources for
anything that goes in the JSON.

#### Recommended sources (pick 5–10 per event)

| Source | Best for |
|--------|----------|
| [PGA TOUR](https://www.pgatour.com) | Official tournament coverage, field, dates, purse, live scoring, First Look previews |
| [Golfweek](https://golfweek.usatoday.com) | News, rankings, weekly tour context |
| [GOLF.com](https://golf.com) | News and analysis mix |
| [Golf Channel](https://www.golfchannel.com) | News, analysis, odds roundups, broadcast schedules |
| [Golf Monthly](https://www.golfmonthly.com) | Broader tour news plus equipment and instruction angles |
| [CBS Sports Golf](https://www.cbssports.com/golf/) | Betting- and fantasy-friendly: news, odds, stats, projections |
| [bunkered](https://www.bunkered.co.uk) | Opinionated, culture-heavy weekly reads |
| Event site (e.g. `{eventname}.com`) | Field lists, local storylines, qualifying notes |
| DraftKings / Yahoo Sports / Action Network | Odds boards and betting angles |

**How to use them:** PGA TOUR for official facts; Golfweek and GOLF.com for
narrative hooks; Golf Channel and CBS for odds and field analysis; Golf Monthly
or bunkered when you need an extra storyline or cultural angle beyond the
standard preview.

| Section | What to find |
|--------|----------------|
| Summary | Main storylines: defending champ, favorites, course fit, field notes |
| Best Players and Odds | 8–10 contenders with American odds ranges (e.g. `+850 to +1000`) |
| Tournament History | Venue, year founded, defending champion, tradition |
| Course and Format | Course name, dates, purse, format, yardage/par profile |
| Broadcast Information | TV/streaming windows (Golf Channel, CBS, ESPN, etc.) |

**Odds sources:** Golf Channel, CBS Sports, DraftKings, Yahoo Sports, Action
Network — report a **range** when books disagree.

**Do not invent** withdrawals, tee times, or odds. If data is unavailable, use
honest placeholders only where the template allows (e.g. generic broadcast line).

### Step 3: Draft JSON

Follow the canonical structure in [reference.md](reference.md).

Rules:

- **Summary** section: exactly one item with `"label": ""` and a single prose
  paragraph (2–4 sentences). No bullets in Summary.
- **Best Players and Odds**: 8–10 players; label format
  `"Player Name (+low to +high):"`; body is one sentence on why they fit.
- Tone: conversational, informed fan — like Perplexity or a sharp preview
  article. No markdown inside JSON strings.
- Use straight apostrophes in JSON (`'` inside strings is fine; avoid smart
  quotes that break JSON).

Canonical section order:

1. Summary
2. Best Players and Odds
3. Tournament History
4. Course and Format
5. Broadcast Information

### Step 4: Validate

From repo root:

```bash
node .cursor/skills/tournament-summary/scripts/validate-summary.mjs server/src/tournamentSummaries/R2026023.json
```

Fix any reported errors before writing or handing off.

### Step 5: Write file

Save to:

```
server/src/tournamentSummaries/{pgaTourId}.json
```

`initTournament` loads this file on tournament init and stores it on the
`Tournament.summarySections` field. After updating a summary for the active
event, the user can re-run:

```bash
cd server && pnpm run service:init-tournament R2026023
```

## Style reference

Gold-standard examples in the repo:

- `server/src/tournamentSummaries/R2026021.json` — Summary lead + odds format
- `server/src/tournamentSummaries/R2026023.json` — Signature event preview

Older files may use `Key Storylines` instead of `Summary`; **prefer the
R2026021 layout** for new summaries.

## Additional resources

- JSON template and field notes: [reference.md](reference.md)
