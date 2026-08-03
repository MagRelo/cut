# Tournament Summary Reference

## Output target

Write to **`CompetitionEvent.metadata.summarySections`** for sport `pga-golf`
and `externalId` = `{pgaTourId}`.

```bash
# from server/
pnpm run script:write-tournament-summary R2026023 /tmp/R2026023-summary.json
pnpm run script:write-tournament-summary R2026023 --dump
```

Event must exist (`service:init-event`) before write. In-app and email read
metadata from the DB. Legacy `server/src/tournamentSummaries/*.json` files are
optional seed/fallback only — do not create new ones.

## How content is presented

| JSON section | Surface |
|--------------|---------|
| **Event Blurb** | Announcement card (email + in-app preview): name, course · place, dates, then this prose |
| **From the 19th Hole** | Quote blocks under **from the 19th hole:** |
| **Best Players and Odds** | Bullet list |
| **Course and Format** | Bullet list |
| **Broadcast Information** | Bullet list |

Legacy title **Tournament History** is still accepted as Event Blurb. Prefer **Event Blurb**.

## JSON schema

Top level: array of sections. Each section:

```json
{
  "title": "Section Title",
  "items": [
    {
      "label": "Optional label:",
      "body": "Required text content."
    }
  ]
}
```

- `body` is required and must be non-empty.
- `label` is optional; used for bullet sections (Best Players and Odds, etc.).
- **Event Blurb:** exactly **one** item, **body only** (no `label`).
- Quote items (`From the 19th Hole`) use `body`, `attribution`, and `color` (hex).
- Legacy `Summary` section title is still accepted; prefer `From the 19th Hole`.
- Parser: `parseSummarySections()` / `getEventBlurb()` in `@cut/sport-pga-golf`.

## Canonical template

Replace `{...}` placeholders. Keep valid JSON.

```json
[
  {
    "title": "From the 19th Hole",
    "items": [
      {
        "body": "{CutBot quote: 3 short sentences. Evocative place/atmosphere, week stakes, max 2 names, forward hook. See SKILL.md CutBot quote voice.}",
        "attribution": "CutBot",
        "color": "#3b82f6"
      }
    ]
  },
  {
    "title": "Event Blurb",
    "items": [
      {
        "body": "{2 short sentences for the announcement card: course character + one notable beat (tradition, defending champ, FedExCup context). No labels. Do not repeat the course/city/date already shown in the card header.}"
      }
    ]
  },
  {
    "title": "Best Players and Odds",
    "items": [
      {
        "label": "{Player} (+{low} to +{high}):",
        "body": "{One plain sentence: why fans should watch this player this week. Include (+low to +high) only from 2+ sportsbooks for this event; otherwise use '{Player}:' with no odds.}"
      }
    ]
  },
  {
    "title": "Course and Format",
    "items": [
      { "label": "Course:", "body": "{Course name, city, state.}" },
      { "label": "Dates:", "body": "{Month D through Month D, YYYY.}" },
      { "label": "Purse:", "body": "${amount}." },
      { "label": "Format:", "body": "{Field size and 72-hole stroke play.}" },
      { "label": "Course Profile:", "body": "{Yardage, par, playing characteristics.}" }
    ]
  },
  {
    "title": "Broadcast Information",
    "items": [
      { "label": "Coverage:", "body": "{Networks and time windows, or generic PGA Tour coverage line.}" },
      { "label": "Event Window:", "body": "Competition runs {dates}." }
    ]
  }
]
```

## Research checklist

Check **5–10 sources** per event for storylines, odds, and course context.

### Weekly golf news sources

| Source | Best for |
|--------|----------|
| [PGA TOUR](https://www.pgatour.com) | Official tournament coverage and live scoring |
| [Golfweek](https://golfweek.usatoday.com) | News and rankings |
| [GOLF.com](https://golf.com) | News and analysis |
| [Golf Channel](https://www.golfchannel.com) | News, analysis, odds, broadcast |
| [Golf Monthly](https://www.golfmonthly.com) | Broader tour news, equipment, instruction |
| [CBS Sports Golf](https://www.cbssports.com/golf/) | Betting/fantasy: news, odds, stats, projections |
| [bunkered](https://www.bunkered.co.uk) | Opinionated, culture-heavy weekly reads |

### Primary URLs

| Source | URL pattern |
|--------|-------------|
| PGA Tour overview | `https://www.pgatour.com/tournaments/2026/overview/{pgaTourId}` |
| PGA Tour First Look | Search `{event name} first look site:pgatour.com` |
| PGA Tour event page | Search `{event name} R{pgaTourId} site:pgatour.com` |
| Tournament site | Many events have `{eventname}.com` with field/broadcast pages |

### Facts to verify

- Official tournament name (including sponsor)
- Dates (Thu–Sun typical; confirm year)
- Purse and FedExCup points
- **Defending champion of this event** — PGA Tour past results for `{pgaTourId}`
- **Past winners at this event/course** — not major wins unless writing about a major
- Field size (144 standard; 132 invitational; 72–80 Signature)
- Course yardage and par from PGA Tour course tab
- Withdrawals affecting the odds board
- **2026 season wins** for any player before claiming "first win" or win counts
- **Major champion status** before using "major winner"

### Odds guidance

- List **8–10** players, ordered roughly by market rank (or OWGR / form if the
  board is not posted yet).
- **Never invent American odds.** Only include `+low to +high` in the label when
  you have quotes from **2+ sportsbooks for this event this week**.
- If books have not posted yet, use `"Player Name:"` with no odds numbers.
- Widen the range when books disagree; do not invent a tight band.
- Tie each pick to **verified** event history, recent form, or plain course-fit opinion.
- When unsure of a fact, **use course fit** — never guess history or odds.

### Writing style

**Audience:** golf fans on a betting platform — they want a quick, enticing read
with real context, not a press release or odds terminal.

**Event Blurb (announcement card):**

| Do | Don't |
|----|--------|
| 2 short sentences | Bullet lists or Venue:/Established: labels |
| Course character + one notable beat | Repeat course/city/dates from the card header |
| Tradition, defending champ, or week stakes | Dense fact stacks (purse, yardage — use Course and Format) |

**CutBot quote (From the 19th Hole):**

| Do | Don't |
|----|--------|
| Open with place, atmosphere, and week vibe | Open with contrarian or oppositional hooks |
| Set stakes for the week (tune-up, defend, major next) | Stack 3+ player names in a row |
| Name **at most 2** players tied to the story | List half the field (odds section does that) |
| Use 3 tight, conversational sentences | Write one long compound sentence |
| Sound evocative and inviting | Sound like a betting wire or PGA press release |
| Light betting flavor (“tops the board,” “defends”) | Put American odds or market rank in the quote |

**Sentence length:** aim for under ~22 words per sentence in CutBot quotes.

**Odds section:** one sentence per player; fan-readable reason to watch. **Verify
factual claims against this event's past results** — see SKILL.md Step 4. Prefer
course-fit opinion over unverified history.

**Other sections:** factual and scannable (Course, Broadcast). Personality lives in
From the 19th Hole (CutBot + user quotes); context teaser lives in Event Blurb.

**Tense:** present tense for upcoming events.

**Format:** no bullet characters inside `body` strings; no markdown.

**Tone calibration:** use `quote variants` in the skill prompt to generate three
CutBot options before writing to the DB.

## Post-tournament recap (optional)

If the user requests `recap` or the event is complete:

- Rewrite **Event Blurb** / quotes as a results teaser if useful.
- Replace **Best Players and Odds** with **Top Finishers** or keep odds section
  only if user wants pre-event content preserved elsewhere.

For finished events, prefer generating the **next** week's preview unless the
user explicitly wants a results write-up for this event.

## Example prompts

```
Generate a tournament summary for R2026023
```

```
@tournament-summary preview only R2026041
```

```
@tournament-summary quote variants R2026030
```

```
@tournament-summary quote only R2026030
```
