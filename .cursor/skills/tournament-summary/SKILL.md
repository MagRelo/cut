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

Content appears in the app tournament preview and the **New Tournament email**
(first quote under **They Out Here Sayin:**). The **CutBot quote** is the lead —
evocative, engaging, and sets the tone for the week. User quotes (added manually)
can be spikier; CutBot should feel like a welcoming column intro. Light betting
angles are fine; save odds boards and the full field for **Best Players and Odds**.

## Quick prompt (user copy-paste)

```
Generate a tournament summary for R2026023
```

Replace the ID with any `pgaTourId`. Optional flags:

- `write file` — save JSON (default)
- `preview only` — show JSON in chat, do not write
- `quote only` — rewrite the CutBot quote item only; keep other quotes and sections unchanged
- `quote variants` — output **three** labeled Summary bodies in chat (no file
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
- [ ] Step 6: Write file (unless preview only)
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
| They Out Here Sayin | **CutBot quote** — place/vibe first, week stakes, max 2 names; user quotes added manually |
| Best Players and Odds | 8–10 contenders with American odds ranges (e.g. `+850 to +1000`) |
| Tournament History | Venue, year founded, defending champion, tradition |
| Course and Format | Course name, dates, purse, format, yardage/par profile |
| Broadcast Information | TV/streaming windows (Golf Channel, CBS, ESPN, etc.) |

**Odds sources:** Golf Channel, CBS Sports, DraftKings, Yahoo Sports, Action
Network — report a **range** when books disagree.

**Do not invent** withdrawals, tee times, odds, win counts, past champions, or
major titles. If a fact cannot be verified from **this week's event** sources,
use a **course-fit or form opinion** instead of a specific historical claim.

### Step 3: Draft JSON

Follow the canonical structure in [reference.md](reference.md).

Rules:

- **They Out Here Sayin** section: skill writes **only the first quote** (CutBot).
  User quotes (0–3) are added manually later. Each quote item:
  - `body` — **3 short sentences** (see CutBot quote voice below)
  - `attribution` — `"CutBot"` for the skill quote
  - `color` — `#7cb68a` for CutBot unless told otherwise
- **Best Players and Odds**: 8–10 players; label format
  `"Player Name (+low to +high):"`; body is **one plain sentence** — why fans
  should care this week. **Verify every factual claim** (see Step 4); prefer
  course fit over unverified history.
- **CutBot voice:** evocative and week-setting — place and atmosphere first,
  what's at stake this week, **at most 2 player names**. Warm and inviting, not
  oppositional or contrarian. A light betting read (“tops the board,” “defends”)
  is welcome; **no American odds** in the quote.
- Use straight apostrophes in JSON (`'` inside strings is fine; avoid smart
  quotes that break JSON).

Canonical section order:

1. They Out Here Sayin
2. Best Players and Odds
3. Tournament History
4. Course and Format
5. Broadcast Information

### Step 4: Fact-check pass (required)

Before validate/write, re-read every odds blurb and history line against sources.
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

1. **Odds range** — pull from **2+ sportsbooks** the week of the event (DraftKings,
   Golf Channel, CBS, Action Network). Widen the range if books disagree; do not
   guess a tight band.
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

- "Still hunting his first win of [year]" without checking season results
- "Major winner" for a player without a major
- "Won here" when the win was a different tournament or major
- Win-count claims ("four wins this season")
- Defending champion for the wrong event (e.g. Open champ ≠ Scottish Open defender)
- Transferring facts from a tune-up major to this week's event

### Step 5: Validate

From repo root:

```bash
node .cursor/skills/tournament-summary/scripts/validate-summary.mjs server/src/tournamentSummaries/R2026023.json
```

Fix any reported errors before writing or handing off.

### Step 6: Write file

Save to:

```
server/src/tournamentSummaries/{pgaTourId}.json
```

`service:init-event` (PGA golf plugin) loads this file on event init and stores sections on the
event metadata. After updating a summary for the active event, re-run init:

```bash
pnpm run service:init-event pga-golf R2026023
```

## CutBot quote voice

The CutBot quote is the **first thing in the New Tournament email** — it should
pull readers into the week: evocative place, real stakes, forward momentum. Save
contrarian/spiky takes for user quotes later in the block.

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
only (no file write):

- **A — Evocative host** — place and atmosphere, week stakes, max 2 names
  **(CutBot default)**
- **B — Storyline focus** — one narrative thread (defending champ, major tune-up)
- **C — Insider edge** — slightly spikier; more betting-aware (use sparingly for CutBot)

After the user picks a direction, apply it to the full summary or run
`quote only` to update just the CutBot quote item.

Preview in email chrome after choosing:

```bash
pnpm --filter server run script:email-preview new-tournament open
```

### Odds blurbs

Keep **one sentence**, fan-readable. **Every factual claim must be verified for
this week's event** (Step 4) — wrong history is worse than vague course fit.

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

Gold-standard examples in the repo:

- `server/src/tournamentSummaries/R2026541.json` — CutBot quote tone + multi-quote layout
- `server/src/tournamentSummaries/R2026021.json` — odds section format

Older files may use `Summary` or `Key Storylines`; **prefer the R2026541 layout**
for new summaries.

## Additional resources

- JSON template and field notes: [reference.md](reference.md)
