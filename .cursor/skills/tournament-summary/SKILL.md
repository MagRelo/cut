---
name: tournament-summary
description: >-
  Research and write PGA Tour tournament preview JSON for Play The Cut.
  Use when the user provides a pgaTourId (e.g. R2026023), asks for a
  tournament summary, Perplexity-style preview, or updates
  server/src/tournamentSummaries/*.json.
---

# Tournament Summary Generator

Produce a **casual-fan tournament preview** for a PGA Tour event and save it to
`server/src/tournamentSummaries/{pgaTourId}.json`.

Content appears in the app summary modal and the **New Tournament email** lead
block — write like a welcoming sports-column intro, not a betting wire or stat
sheet.

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
| Summary | **Place, course, history, nostalgia** — why this week feels special; 2–3 star names max; one light “what to watch” hook |
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

- **Summary** section: exactly one item with `"label": ""` and **2–4 short
  sentences** (see voice guide below). No bullets in Summary.
- **Best Players and Odds**: 8–10 players; label format
  `"Player Name (+low to +high):"`; body is **one plain sentence** — why fans
  should care, not a stat dump.
- **Voice:** welcoming, nostalgic, excited — for **casual fans** who know a few
  big names and love the *feel* of a tournament week. Think sports-page column
  (Sporting News / Chicago Tribune), not odds terminal or PGA press release.
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

`service:init-event` (PGA golf plugin) loads this file on event init and stores sections on the
event metadata. After updating a summary for the active event, re-run init:

```bash
pnpm run service:init-event pga-golf R2026023
```

## Summary voice (casual fan)

The Summary is the email lead and first thing users read. Optimize for **place,
course, history, and nostalgia** — then
make casual fans feel welcome.

### Lead with

1. **Where** — city, region, course name (e.g. “Quad Cities,” “Silvis,
   Illinois,” “TPC Deere Run”).
2. **Why this week matters** — tradition, anniversary, tune-up before a major,
   fan-friendly Midwest stop, etc.
3. **2–3 recognizable names** — defending champ, past winner with local history,
   one current favorite or fan favorite. Not a full field list.
4. **One inviting hook** — low scores, summer vibe, comeback story, first win
   nostalgia. Save the rest for other sections.

### Writing rules

- **Short sentences.** One idea per sentence. Avoid chains of clauses joined by
  “while,” “with,” and comma splices.
- **Less information density.** No yardage, par, purse, or field size in
  Summary — those live in Course and Format.
- **Warm and welcoming**, not stiff or transactional. You’re inviting someone
  into the week, not filing a report.
- **Nostalgic when it fits** — first Tour win here, decades on the calendar,
  local love, iconic holes, sponsor/community ties.
- **Exciting but honest** — enthusiasm without hype or invented drama.
- Third person, present tense for upcoming events.
- No markdown inside JSON strings.

### Avoid in Summary

- Compound sentences packing 4+ facts.
- Betting jargon (“co-favorite,” “profiles well,” “market rank”).
- Amateur/pro debut details unless it’s *the* story of the week.
- Course renovation minutiae (save for Course Profile or omit).
- Listing more than three player names.

### Odds blurbs

Keep **one sentence**, fan-readable: recent win, past champ here, popular
draw, hot streak — not “approach game” / “tee-to-green profile” jargon unless
unavoidable.

## Style reference

Gold-standard examples in the repo:

- `server/src/tournamentSummaries/R2026021.json` — warm Summary lead + odds format
- `server/src/tournamentSummaries/R2026030.json` — casual-fan Midwest / nostalgia tone

Older files may use `Key Storylines` instead of `Summary`; **prefer the
R2026021 layout** for new summaries.

## Additional resources

- JSON template and field notes: [reference.md](reference.md)
