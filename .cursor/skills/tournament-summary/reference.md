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
        "body": "{2–4 sentence preview: event name, venue, main storyline, course fit.}"
      }
    ]
  },
  {
    "title": "Best Players and Odds",
    "items": [
      {
        "label": "{Player} (+{low} to +{high}):",
        "body": "{One sentence: why they fit this course/week.}"
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

- Third person, present tense for upcoming events.
- Avoid bullet characters inside `body` strings.
- One idea per odds blurb; no stat dumps.
- Mention 1–2 concrete narrative hooks (three-peat chase, homecoming, major tune-up).

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
Write tournament summary JSON for R2026556 and validate it
```
