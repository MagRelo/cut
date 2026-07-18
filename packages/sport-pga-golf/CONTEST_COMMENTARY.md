# PGA Contest Commentary

The contest commentary pipeline turns current contest data into one compact
analysis context and one 125–175 word update. It does not use JSON files as an
inter-process contract.

## Callable service

`server/src/services/contest/generateContestCommentary.ts` is the public
entry point:

```ts
const result = await generateContestCommentary(contestId, options);
```

It returns:

- `schemaVersion` and `generatedAt`
- the validated `commentary`
- the typed `context` used to generate it
- compact loading and score-drift `diagnostics`

The text generator is injectable. Production defaults to a one-shot Cursor SDK
generator using `CURSOR_API_KEY`; tests and future providers can supply the
`CommentaryTextGenerator` interface.

## Direct context contract

`analyzeContestCommentary` returns `ContestCommentaryContext` directly. The
context contains the race and paid cut, ordered contention lineups,
high-leverage golfers and their owners, high-rarity lineups and
differentiators, consensus golfers, uncertainty notes, and compact simulation
metadata. Scenario arrays, full-field projections, and per-entry affect lists
remain private simulation details.

Ownership, leverage, rarity, payout impact, and consensus all use the same
contention cohort. Participant and entry IDs establish identity; display names
are labels only. Rarity is normalized by each lineup's actual roster size.
Rarity measures differentiation, not lineup quality. Exactly one tied lineup is
chosen as the favorite, and paid-place count is passed explicitly to analysis.

## Calibration

The generic model reads prior PGA `EventParticipant.scoreData`, excluding the
current event. Only persisted rounds with 18 finite par, score, and Stableford
values are included. Every accepted completed hole becomes one empirical
`{ par, stableford, strokesToPar }` outcome. The model is cached in-process with
a bounded one-hour TTL; failed loads are evicted.

## Commands

Generate only the final update:

```sh
pnpm --filter server run script:contest-commentary <contestId>
```

Inspect fresh context and diagnostics without calling the text generator:

```sh
pnpm --filter server run script:contest-commentary <contestId> --context
```

Neither command creates a report file.

## Out of scope

API routes, cron registration, feed persistence, deduplication, notification
delivery, and fallback-copy policy are intentionally left to future callers of
the same service.
