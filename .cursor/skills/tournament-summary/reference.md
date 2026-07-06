# Tournament Summary Reference

## Output path

```
server/src/tournamentSummaries/{pgaTourId}.json
```

Loaded by `server/src/lib/tournamentSummary.ts` and
`server/src/sports/pga-golf/initEvent.ts` (via `loadSummarySections`).

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
- `label` is optional; use `""` only for the Summary lead paragraph.
- Parser: `parseSummarySections()` in `server/src/lib/tournamentSummary.ts`.

## Canonical template

Replace `{...}` placeholders. Keep valid JSON.

```json
[
  {
    "title": "Summary",
    "items": [
      {
        "label": "",
        "body": "{3–4 short sentences: story hook with tension, frank take on how the week plays, place/vibe, 2–3 names tied to the story. Conversational quote voice — light betting OK, no odds prices. See SKILL.md quote voice guide.}"
      }
    ]
  },
  {
    "title": "Best Players and Odds",
    "items": [
      {
        "label": "{Player} (+{low} to +{high}):",
        "body": "{One plain sentence: why fans should watch this player this week.}"
      }
    ]
  },
  {
    "title": "Tournament History",
    "items": [
      { "label": "Venue:", "body": "{Course and location.}" },
      { "label": "Established:", "body": "{Year and notable fact.}" },
      { "label": "Defending Champion:", "body": "{Last winner and year.}" },
      { "label": "Tradition:", "body": "{Event identity or charity/legacy note.}" }
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
- Defending champion (prior calendar year winner for next edition)
- Field size (144 standard; 132 invitational; 72–80 Signature)
- Course yardage and par from PGA Tour course tab
- Withdrawals affecting the odds board (Scheffler, McIlroy, etc.)

### Odds guidance

- List **8–10** players, ordered roughly by market rank.
- Use American odds with `+` prefix.
- When books differ, show a range: `(+1800 to +2200)`.
- Tie each pick to **course fit** or **recent form**, not just rank.

### Writing style

**Audience:** golf fans on a betting platform — they want a quick, enticing read
with real context, not a press release or odds terminal.

**Summary quote (most important):**

| Do | Don't |
|----|--------|
| Open with a story hook or tension | Open with venue/history or field size |
| Give a frank insider take on the week | Stack facts in one compound sentence |
| Name 2–3 players tied to *why* they matter | List half the field |
| Use conversational, direct sentences | Sound like a PGA media guide |
| Light betting flavor (favorite, value, low scores) | Put American odds or market rank in Summary |
| Sound opinionated but honest | Invent drama or hype |

**Sentence length:** aim for under ~25 words per sentence in Summary when possible.

**Odds section:** one sentence per player; fan-readable reason to watch. Betting-aware
phrasing and course fit are fine — avoid stacked stats and jargon.

**Other sections:** factual and scannable (History, Course, Broadcast). Personality
lives in Summary.

**Tense:** present tense for upcoming events.

**Format:** no bullet characters inside `body` strings; no markdown.

**Tone calibration:** use `quote variants` in the skill prompt to generate three
Summary options before writing the file.

## Post-tournament recap (optional)

If the user requests `recap` or the event is complete:

- Rewrite **Summary** as a results paragraph (winner, margin, playoff, storyline).
- Replace **Best Players and Odds** with **Top Finishers** or keep odds section
  only if user wants pre-event content preserved elsewhere.
- Update **Defending Champion** in History for the *next* year's file, not this one.

For finished events, prefer generating the **next** week's preview unless the
user explicitly wants a results write-up in the same file.

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
