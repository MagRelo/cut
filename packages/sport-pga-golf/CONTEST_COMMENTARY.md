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
context contains period-aware `eventProgress`, the race and paid cut, ordered
contention lineups, high-leverage golfers and their owners, high-rarity
lineups and differentiators, consensus golfers, uncertainty notes, and compact
simulation metadata. Scenario arrays, full-field projections, and per-entry
affect lists remain private simulation details.

Ownership, leverage, rarity, payout impact, and consensus all use the same
contention cohort. Participant and entry IDs establish identity; display names
are labels only. Rarity is normalized by each lineup's actual roster size.
Rarity measures differentiation, not lineup quality. Exactly one tied lineup is
chosen as the favorite, and paid-place count is passed explicitly to analysis.

### Event progress stages

`resolveCommentaryStage(period)` maps the active period to an event-long stage:

| Period | Stage ID | Leader progress |
| --- | --- | --- |
| 1 | `opening_round` | omitted |
| 2 | `cut_round` | omitted |
| 3 | `weekend_move` | included |
| 4 | `final_round` | included |
| other / null | `unknown` | omitted |

Weekend stages attach `eventProgress.leaderProgress` (leader names, holes
remaining, and pace) because tee times are ordered. Early rounds omit it so
commentary is not framed around leader-wave pacing.

## Prompt assembly

Shared broadcast voices live in `@cut/sport-sdk`
(`contestCommentaryVoices`). PGA stage instructions live in
`packages/sport-pga-golf/src/contestCommentaryPrompt.ts` via
`buildPgaContestCommentaryPrompt` (snapshot) and `buildPgaContestFeedPrompt`
(feed). Story type is the primary prompt selector for feed items; stage
instructions remain an overlay. A short output contract (no invented facts;
plain prose only) always appends. The server prompt helpers supply word limits
and delegate to those builders.

## Contest commentary feed

`Contest.commentary` remains a single prose snapshot. The rolling story feed
lives in a separate `Contest.commentaryFeed` JSON document:

```ts
{
  schemaVersion: 1,
  items: ContestFeedItem[], // newest first, capped
  lastContext?: ContestCommentaryContext,
  updatedAt?: string
}
```

`classifyContestFeedStories` compares the previous `lastContext` to the fresh
analysis and emits rule-based candidates (`race_shakeup`, `leverage_spike`,
`stage_recap` in the first pass). Each selected story gets a narrow fact pack
and a story-specific prompt. New items are prepended and trimmed to a rolling
cap (30).

Callable service: `server/src/services/contest/generateContestFeed.ts`.

## Calibration

The generic model reads prior PGA `EventParticipant.scoreData`, excluding the
current event. Only persisted rounds with 18 finite par, score, and Stableford
values are included. Every accepted completed hole becomes one empirical
`{ par, stableford, strokesToPar }` outcome. The model is cached in-process with
a bounded one-hour TTL; failed loads are evicted.

## Commands

Generate only the final snapshot update:

```sh
pnpm --filter server run script:contest-commentary <contestId>
```

Inspect fresh context and diagnostics without calling the text generator:

```sh
pnpm --filter server run script:contest-commentary <contestId> --context
```

Classify feed candidates without generating copy:

```sh
pnpm --filter server run script:contest-feed <contestId> --classify
```

Generate feed items (optionally persist with `--write`):

```sh
pnpm --filter server run script:contest-feed <contestId>
pnpm --filter server run script:contest-feed <contestId> --write
```

Neither command creates a report file.

## Scheduled delivery

When `CONTEST_COMMENTARY_ENABLED=true` and `CURSOR_API_KEY` is configured, the
server cron pipeline refreshes commentary for entered `ACTIVE` or `LOCKED` PGA
contests while their event reports `LIVE`. The refresh runs after live scoring
and lineup updates and replaces `Contest.commentary` when the snapshot is
missing or at least 20 minutes old. The same pass merges new story items into
`Contest.commentaryFeed`. Generation failures leave previous values intact.

The contest lobby API includes the latest commentary snapshot, feed document,
and generation timestamps. The client exposes the snapshot from the Winner Pool
information panel.
