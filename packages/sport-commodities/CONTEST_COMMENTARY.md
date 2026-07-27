# Commodities Contest Commentary

End-of-day contest overview commentary for Commodity Picks. Writes
`Contest.commentary` (Cutbot **Live Analysis**). Rolling feed stories and
Stream dual-write are Phase 2.

## Product

| Surface | Storage | Cadence | Status |
| --- | --- | --- | --- |
| Overview snapshot | `Contest.commentary` + `commentaryGeneratedAt` | After each trading day settles (Mon–Fri) | v1 |
| Rolling feed | `Contest.commentaryFeed` + Stream | Period fingerprints / movers | Phase 2 |

Overview length: **125–175 words**, same word contract as PGA.

## Daily summary data contract

`analyzeCommoditiesContestCommentary` builds a compact context with:

**Race**

- Lineup scores / positions / gap to paid cut / outlook tier
- `paidCount`, leader and cut scores
- Pick display names per lineup

**Period progress**

- `settledPeriod` (1–5) — highest fully non-provisional round across the field
- `dayLabel` (`Mon`…`Fri`)
- `roundsRemaining`, stage id (`opening_day` / `midweek` / `late_week` / `final_day`)

**Market → contest**

- `dayMovers` — owned tickers with that day’s fantasy points and `%` return
- Ownership counts and owning user names
- `consensusPicks` / `sharedPicks`
- `uncertaintyNotes` (early week, one day left, all legs settled, missing predictions)

No Monte Carlo remaining-legs model in v1.

## Callable path

```ts
const result = await generateContestCommentary(contestId);
```

Sport dispatch loads the commodities context builder when
`event.sportId === "commodities"`. Prompt assembly uses
`buildCommoditiesContestCommentaryPrompt` and shared voices from
`@cut/sport-sdk` (`contestCommentaryVoices`).

Manual:

```sh
pnpm --filter server run script:contest-commentary <contestId>
pnpm --filter server run script:contest-commentary <contestId> --context
```

## Cron

`overviewPipeline` (`*/20`) calls `refreshCommoditiesContestOverviews`:

1. Find `ACTIVE` / `LOCKED` / `SETTLED` contests on the active commodities event
2. Derive `settledPeriod` from field `scoreData` (`r1`…`r5` provisional flags)
3. Skip when no day has settled, or when `commentaryGeneratedAt` is already at/after that day’s session close
4. Generate and persist overview under the shared commentary LLM mutex

Requires `CONTEST_COMMENTARY_ENABLED=true` and `CURSOR_API_KEY`.

## Phase 2 — feed (deferred)

Reuse golf’s `CommentaryFeedJob` + Stream path with commodities classifiers:

| Story | Trigger |
| --- | --- |
| `stage_recap` | Settled period advances |
| Day mover flash | Large owned ticker swing (final or provisional) |
| `leverage_spike` | Rare ownership of a big day mover |

Fingerprints: period + round totals / prices (not golf holes). Document story
prompts in this file when implemented.

## References

- Golf commentary: [`packages/sport-pga-golf/CONTEST_COMMENTARY.md`](../sport-pga-golf/CONTEST_COMMENTARY.md)
- Add-sport checklist Phase 8: [`spec/platform/add-sport-checklist.md`](../../spec/platform/add-sport-checklist.md)
- Stream delivery: [`docs/platform/stream-feeds.md`](../../docs/platform/stream-feeds.md)
