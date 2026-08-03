---
name: tournament-summary
description: >-
  Research and write PGA Tour tournament preview copy for Play The Cut into
  CompetitionEvent.metadata.summarySections. Use when the user provides a
  pgaTourId (e.g. R2026023), asks for a tournament summary, Perplexity-style
  preview, or updates event summary / announcement card content.
---

# Tournament Summary Generator

Produce a **casual-fan tournament preview** for a PGA Tour event and write it to
`CompetitionEvent.metadata.summarySections` for that event's `externalId`
(`pgaTourId`).

**Prerequisite:** the event must already exist — run
`pnpm run service:init-event pga-golf {pgaTourId}` first (from `server/`).

Content appears in the **announcement card** (Event Blurb + event header) and under
**from the 19th hole:** in both the in-app tournament preview
and the **New Tournament email**. The **CutBot quote** is the lead voice —
evocative, engaging, and sets the tone for the week. User quotes (added manually)
can be spikier; CutBot should feel like a welcoming column intro. Light betting
angles are fine; save odds boards and the full field for **Best Players and Odds**.

## Quick prompt (user copy-paste)

```
Generate a tournament summary for R2026023
```

Replace the ID with any `pgaTourId`. Optional flags:

- `write db` — validate and write to DB (default)
- `preview only` — show JSON in chat, do not write
- `quote only` — rewrite the CutBot quote item only; keep other quotes and sections unchanged
- `quote variants` — output **three** labeled Summary bodies in chat (no DB
  write); use to calibrate tone before committing
- `recap` — post-tournament results instead of pre-event preview

## Workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Resolve tournament from pgaTourId
- [ ] Step 2: Web research (5–10 sources; see source table below)
- [ ] Step 3: Draft JSON in canonical format
- [ ] Step 4: Fact-check pass (see below — required before validate)
- [ ] Step 5: Validate JSON
- [ ] Step 6: Write to DB (unless preview only)
```

### Step 1: Resolve tournament

1. Confirm ID format: `R` + year + event number (e.g. `R2026023`).
2. Confirm the event row exists (init already run). If unsure, dump:
   `pnpm run script:write-tournament-summary R2026023 --dump` (from `server/`).
   Missing event → tell the user to run `service:init-event` first.
3. Open PGA Tour overview:
   `https://www.pgatour.com/tournaments/2026/overview/{pgaTourId}`
   or search: `PGA Tour {pgaTourId} overview`.
4. Note: official name, venue, city/state, dates, purse, FedExCup points,
   field size, par, yardage, event type (Signature, major, etc.).
5. Check whether the event is **upcoming** or **already finished** (compare
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
| From the 19th Hole | **CutBot quote** — place/vibe first, week stakes, max 2 names; user quotes added manually |
| Event Blurb | **Announcement card prose** — 2 sentences: course character + one notable beat (not a fact list) |
| Best Players and Odds | 8–10 contenders; include American odds **only** when sourced from books |
| Course and Format | Course name, dates, purse, format, yardage/par profile |
| Broadcast Information | TV/streaming windows (Golf Channel, CBS, ESPN, etc.) |

**Odds — hard rule: never invent.**

- Pull American odds from **2+ sportsbooks** for **this event this week**
  (DraftKings, FanDuel, Golf Channel, CBS, Action Network, etc.).
- Report a **range** when books disagree (e.g. `+850 to +1000`).
- If books have **not posted** this week's board yet — **omit odds from labels**.
  Use `"Player Name:"` only. Do **not** estimate from OWGR, FedExCup rank,
  last week's event, implied probability, or “what a favorite usually is.”
- Never copy odds from a different tournament into this week's labels.

**Do not invent** withdrawals, tee times, odds, win counts, past champions, or
major titles. If a fact cannot be verified from **this week's event** sources,
use a **course-fit or form opinion** instead of a specific historical claim.

### Step 3: Draft JSON

Follow the canonical structure in [reference.md](reference.md).

Rules:

- **From the 19th Hole** section: skill writes **only the first quote** (CutBot).
  User quotes (0–3) are added manually later. Each quote item:
  - `body` — **3 short sentences** (see CutBot quote voice below)
  - `attribution` — `"CutBot"` for the skill quote
  - `color` — `#3b82f6` (Tailwind blue-500 / primary button) for CutBot unless told otherwise
- **Event Blurb**: exactly **one** item, `body` only (no `label`). **Two short
  sentences** for the announcement card — course character + one notable beat
  (tradition, defending champ, FedExCup context). Do **not** repeat course/city/dates
  already shown in the card header from event metadata.
- **Best Players and Odds**: 8–10 players; body is **one plain sentence** — why
  fans should care this week. Label format:
  - With sourced odds: `"Player Name (+low to +high):"`
  - Without posted odds: `"Player Name:"` (no `+` numbers — never invent)
  **Verify every factual claim** (see Step 4); prefer course fit over
  unverified history.
- **CutBot voice:** evocative and week-setting — place and atmosphere first,
  what's at stake this week, **at most 2 player names**. Warm and inviting, not
  oppositional or contrarian. A light betting read (“tops the board,” “defends”)
  is welcome; **no American odds** in the quote.
- Use straight apostrophes in JSON (`'` inside strings is fine; avoid smart
  quotes that break JSON).

Canonical section order:

1. From the 19th Hole
2. Event Blurb
3. Best Players and Odds
4. Course and Format
5. Broadcast Information

### Step 4: Fact-check pass (required)

Before validate/write, re-read every odds blurb and Event Blurb against sources.
**This step prevents hallucinations** — do not skip it.

#### Tournament scope (most common error)

You are writing about **the event in `pgaTourId` only** — e.g. Genesis Scottish
Open at Renaissance, not The Open Championship at Royal Birkdale.

| Phrase | Means |
|--------|--------|
| "Defending champion" | Won **last year's edition of this event** |
| "Won here" / "champion here" | Won **this tournament** at this course |
| "2023 champion" | Won **this event** in 2023 — not a major unless the file is for that major |

**Never** attribute a major win year to this week's event. McIlroy won The Open in
2014 and the Scottish Open at Renaissance in 2023 — those are different facts.

#### Odds blurbs — verify each player

1. **Odds range** — **only** from **2+ sportsbooks** posting **this event this
   week**. Widen the range if books disagree. If the board is not up yet, leave
   odds out of the label entirely. **Never invent, interpolate, or carry over
   odds from another event.**
2. **Season wins** — check PGA Tour results for 2026 before writing "first win,"
   "second win," or "X wins this season."
3. **Major champion** — only use if the player has actually won a major. When in
   doubt, omit.
4. **Past wins at this event** — confirm on PGA Tour **Past Results** / event
   history for `{pgaTourId}`, not from memory.
5. **Venue-specific lore** (U.S. Amateur site, college ties, etc.) — verify or
   omit. Wrong venue history is worse than no history.

#### Safe blurb patterns (when facts are shaky)

- Course fit: "handles firm links well," "strong in the wind"
- Recent form: "runner-up last month," "won two weeks ago" — **only if verified**
- Event history: "2024 winner at Renaissance," "runner-up here last year" —
   **only if verified on PGA past results**
- Market: "near the top of the board," "live favorite"

#### Red flags — stop and re-research

- **Any American odds not copied from this week's posted sportsbook board**
  (including estimates from rank, form, or last week's prices)
- "Still hunting his first win of [year]" without checking season results
- "Major winner" for a player without a major
- "Won here" when the win was a different tournament or major
- Win-count claims ("four wins this season")
- Defending champion for the wrong event (e.g. Open champ ≠ Scottish Open defender)
- Transferring facts from a tune-up major to this week's event

### Step 5: Validate

Write the draft to a temp file, then from repo root:

```bash
node .cursor/skills/tournament-summary/scripts/validate-summary.mjs /tmp/R2026023-summary.json
```

Fix any reported errors before writing to the DB.

### Step 6: Write to DB

From `server/` (uses `server/.env` / `DATABASE_URL`):

```bash
pnpm run script:write-tournament-summary R2026023 /tmp/R2026023-summary.json
```

Do **not** write `server/src/tournamentSummaries/*.json` — that path is legacy.
In-app and email read `summarySections` from event metadata.

For **quote only**: dump existing copy, replace only the first CutBot quote item,
validate, write back:

```bash
pnpm run script:write-tournament-summary R2026023 --dump > /tmp/R2026023-summary.json
# edit CutBot quote item, then:
pnpm run script:write-tournament-summary R2026023 /tmp/R2026023-summary.json
```

## CutBot quote voice

The CutBot quote sits under **from the 19th hole:** in the New Tournament email
and in-app preview — after the announcement card. It should pull readers into the
week: evocative place, real stakes, forward momentum. Save contrarian/spiky takes
for user quotes later in the block.

### Lead with

1. **Place and atmosphere** — city, coast, course vibe, season moment (e.g.
   midsummer links, last stop before a major).
2. **What makes this week matter** — field strength, defending champ storyline,
   tune-up stakes, one framing line (not a fact stack).
3. **At most 2 names** — betting favorite + one storyline pick (defending champ,
   sentimental local, hot streak). The odds section carries everyone else.
4. **Forward hook** — what's next (The Open, FedExCup push, etc.) when relevant.

### Writing rules

- **Evocative and engaging** — readers should *feel* the week, not get argued with.
- **Conversational.** Direct, readable, a little personality. Contractions are fine.
- **Three sentences** when possible. One idea per sentence; no comma-splice lists.
- **Max 2 player names.** If you need a third storyline, describe it without a name.
- **Light betting flavor** — “tops the board,” “defends,” “favorite” in plain English.
  No American odds, no market recap.
- **No stat density** — yardage, par, purse, field size belong in Course and Format.
- Present tense for upcoming events. No markdown inside JSON strings.

### Avoid in CutBot quotes

- Oppositional openers (“doesn't care who's No. 1,” “the board is wrong”).
- Stacking 3+ player names in a row.
- Contrarian or dunking tone — that's for user quotes.
- Odds-terminal jargon (“profiles well,” “market rank,” “co-favorite at +X”).
- Opening with dry history or venue facts before atmosphere.

### Gold-standard CutBot quote

Genesis Scottish Open (R2026541) — evocative, tight, week-setting:

> North Berwick in July is links golf at its best — wind off the Firth, firm
> fescue, and a field that feels like a major dress rehearsal. Scheffler tops
> the board, McIlroy loves this stretch of coast, and Gotterup defends after
> winning in Silvis on Sunday. The last big tune-up before the year's third major:
> the British Open at Royal Birkdale.

### Calibrating tone (`quote variants`)

When the user asks for **quote variants**, output three labeled options in chat
only (no DB write):

- **A — Evocative host** — place and atmosphere, week stakes, max 2 names
  **(CutBot default)**
- **B — Storyline focus** — one narrative thread (defending champ, major tune-up)
- **C — Insider edge** — slightly spikier; more betting-aware (use sparingly for CutBot)

After the user picks a direction, apply it to the full summary or run
`quote only` to update just the CutBot quote item.

Preview in email chrome after writing to DB:

```bash
pnpm --filter server run script:email-preview new-tournament open
```

### Odds blurbs

Keep **one sentence**, fan-readable. **Every factual claim must be verified for
this week's event** (Step 4) — wrong history is worse than vague course fit.
**Never invent odds** — missing numbers beat made-up `+` prices.

| Verified fact type | OK to use |
|--------------------|-----------|
| Past winner at **this event** | "2023 Scottish Open winner at Renaissance" |
| Defending champion | Only if they won **last year's this event** |
| Recent form | "won the John Deere Sunday" — if verified this season |
| Major champion | Only if player has won a major — cite the major, not this event |
| Opinion | "elite links player," "strong in the wind," "near top of the board" |

**Do not** confuse this week's tournament with The Open, with other Tour stops,
or with major wins. **Do not** invent win counts or venue lore.

## Style reference

Gold-standard examples (legacy JSON still in repo for tone/format only):

- `server/src/tournamentSummaries/R2026525.json` — Event Blurb + announcement card layout
- `server/src/tournamentSummaries/R2026541.json` — CutBot quote tone + multi-quote layout
- `server/src/tournamentSummaries/R2026021.json` — odds section format

Older files may use `Tournament History` (labeled bullets) or `Summary`; **prefer
the Event Blurb + R2026541 quote layout** for new summaries.

## Additional resources

- JSON template and field notes: [reference.md](reference.md)
