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
quote block (italic pull-quote). Write like a **conversational sports column with
a take** — enticing, context-rich, frank about what matters this week. Light
betting angles are fine (this is a betting product); save odds boards and deep
jargon for **Best Players and Odds**.

## Quick prompt (user copy-paste)

```
Generate a tournament summary for R2026023
```

Replace the ID with any `pgaTourId`. Optional flags:

- `write file` — save JSON (default)
- `preview only` — show JSON in chat, do not write
- `quote only` — rewrite the Summary `body` only; keep other sections unchanged
- `quote variants` — output **three** labeled Summary bodies in chat (no file
  write); use to calibrate tone before committing
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
| Summary | **Story hook + insider take** — tension or surprise first, then place/names; 2–3 star names max; one frank “what to watch” angle (betting-friendly OK) |
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

- **Summary** section: exactly one item with `"label": ""` and **3–4 short
  sentences** (see quote voice guide below). No bullets in Summary.
- **Best Players and Odds**: 8–10 players; label format
  `"Player Name (+low to +high):"`; body is **one plain sentence** — why fans
  should care, not a stat dump.
- **Voice:** conversational columnist with a take — story-first hook, frank
  about the week's stakes, warm but not a PGA press release. A light betting
  read (“favorite”, “value”, “board”, “low scores play”) is welcome in Summary;
  save prices and full odds context for **Best Players and Odds**.
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

## Summary quote voice

The Summary `body` renders as an **italic email pull-quote** — it should read
like someone with an opinion, not a tournament fact sheet.

### Lead with (story-first)

1. **A hook with tension** — low scores coming, favorite under pressure, course
   suits bombers or grinders, last chance before a major, etc.
2. **Why that hook matters** — one frank line on how the week will actually play.
3. **Place and vibe** — city, course, tradition in plain language (not a travel
   brochure).
4. **2–3 names tied to the story** — defending champ, course horse, betting
   favorite, sentimental pick. Each name earns its mention.

### Writing rules

- **Conversational.** Write like you're talking a friend through the week — direct,
  readable, a little personality. Contractions are fine.
- **Short sentences.** One idea per sentence. Avoid chains of clauses joined by
  “while,” “with,” and comma splices.
- **Frank insider takes** — “someone's going to go low,” “the board is wide open,”
  “this is a nightmare for the cautious.” Opinionated but honest; don't invent drama.
- **Light betting flavor** — favorites, value, the board, low scores, course fit
  in plain English. **No American odds in Summary** (those belong in Best Players
  and Odds). One betting angle per quote, not a market recap.
- **Less stat density.** No yardage, par, purse, or field size in Summary — those
  live in Course and Format.
- Present tense for upcoming events. No markdown inside JSON strings.

### Avoid in Summary

- Opening with venue/history before the hook (save place for sentence 2–3).
- One compound sentence packing 4+ facts.
- Odds-terminal voice: “profiles well,” “market rank,” “co-favorite at +X.”
- Stacked betting jargon or multiple prices in the quote.
- Amateur/pro debut details unless it’s *the* story of the week.
- Listing more than three player names.

### Gold-standard quote (target tone)

John Deere Classic — story hook, insider take, light betting read, conversational:

> Someone's going to shoot 62 this week. TPC Deere Run has been that kind of
> track when conditions cooperate — low scores, fast leaderboards, and a whole
> lot of guys thinking they have a chance. Spieth has two wins here and the
> emotional tie; Campbell proved last year you don't need to be a household name
> to steal the week. Small-town Silvis, big personalities, last chance to find
> form before The Open.

### Calibrating tone (`quote variants`)

When the user asks for **quote variants**, output three labeled options in chat
only (no file write):

- **A — Insider columnist** — frank, opinionated, betting-aware
- **B — Conversational host** — warm, you-and-me, minimal betting
- **C — Story-first hook** — tension/surprise open, then color (default target)

After the user picks a direction, apply it to the full summary or run
`quote only` to update just the Summary `body`.

Preview in email chrome after choosing:

```bash
pnpm --filter server run script:email-preview new-tournament open
```

### Odds blurbs

Keep **one sentence**, fan-readable: recent win, past champ here, popular draw,
hot streak, course fit. Betting-aware phrasing is fine (“live favorite,” “value
on the board”) — avoid stacked stats and approach-game jargon unless unavoidable.

## Style reference

Gold-standard examples in the repo:

- `server/src/tournamentSummaries/R2026021.json` — odds section format
- Summary quote tone — see **Gold-standard quote** above (prefer over older
  nostalgia-first leads in existing files)

Older files may use `Key Storylines` instead of `Summary`; **prefer the
R2026021 layout** for new summaries.

## Additional resources

- JSON template and field notes: [reference.md](reference.md)
