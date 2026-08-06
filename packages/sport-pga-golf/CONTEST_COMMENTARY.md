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
are labels only. When a user has multiple contest entries, display names include
the lineup number from the lineup name (e.g. `Noodles #2`), matching the lobby
UI. A single user can occupy multiple paid spots via multiple lineups—call that
out when it appears in the race. Rarity is normalized by each lineup's actual roster size.
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
(feed). Story type is the primary prompt selector for feed items. Stage
instructions overlay only `stage_recap` / snapshot prompts; flash stories
(`score_swing`, `tournament_pulse`) omit the stage overlay so weekend/final
“open from leaderProgress” lines cannot override story-type framing. Contest
stories (`score_swing`, `stage_recap`) include the shared event → result
narrative pattern and metric discipline (no “leverage” or quoted ownership
analytics in copy; at most one contest-score pair). `tournament_pulse` uses a
tournament-only narrative instead and skips contest metric discipline.
Intensity tone, a deterministic style directive, and an optional
`RECENTLY_PUBLISHED` anti-repetition block always apply. Word limits resolve
from story type + intensity via `resolveContestFeedWordLimits`. A short output
contract (no invented facts; plain prose only) always appends.

## Contest commentary feed

`Contest.commentary` remains a single prose snapshot. The rolling story feed
lives in a separate `Contest.commentaryFeed` JSON document:

```ts
{
  schemaVersion: 1,
  items: ContestFeedItem[], // newest first, capped; each item may include round
  lastContext?: ContestCommentaryContext,
  lastHoleState?: ContestFeedHoleState, // completed-hole + board/bonus fingerprint
  updatedAt?: string
}
```

`classifyContestFeedStories` compares the previous `lastContext` / `lastHoleState`
to the fresh analysis and emits rule-based candidates (`score_swing`,
`stage_recap`, `tournament_pulse`) with a `priority` and `intensity`
(`routine` | `notable` | `major`). Each selected story gets a narrow fact pack
and a story-specific prompt. Merged items are ordered newest-first by
`generatedAt` with no rolling trim (full tournament history). `lastHoleState` is rewritten
every successful pass so the next tick only sees newly completed holes. Feed
job payloads carry `period` so frozen generation can set `item.round` even when
`lastContext` is missing.

Item ids are `storyType:subjectKey:<generatedAt epoch ms>` via
`buildContestFeedItemId`. The timestamp component makes each pass a new post
while keeping a retry of the same pass idempotent. Ids must stay unique per
post: the Stream mirror treats a repeated id as an update to the existing
activity, which keeps that activity's original `created_at` and pushes the
feed out of chronological order.

`stage_recap` is emitted when the feed has no recap yet or when the tournament
stage changes — one post per stage, not regenerated on a timer. The legacy
`Contest.commentary` snapshot continues to refresh on the batch cadence below.

### Tournament pulse (gap filler)

`tournament_pulse` fills quiet on-course stretches with short PGA tournament
color when nothing else fires. It rides the live score pipeline
(`shouldSyncLiveScores` → `afterLiveScoreSync` / detect) and does not use a
separate timer.

Emit only when all of the following hold:

1. The classifier has **no other candidates** this pass (`score_swing` /
   `stage_recap` win first).
2. The golf period is actively on course: `periodStatusDisplay === "In Progress"`
   or a playoff (`golfPeriodInProgress`). Score sync may still run when the
   period is `Complete` between rounds; pulse must not.
3. Silence since the newest feed item is at least **15 minutes**
   (`CONTEST_FEED_PULSE_GAP_MS`). Any story type resets the silence clock.

Copy is **tournament-only**: leaders, board shape, round/cut progress,
remaining golf when `leaderProgress` is present. Do not narrate contest
standings, owners, fantasy scores, or paid-cut races. The fact pack carries
`eventProgress` plus a top-board snapshot from contest-owned golfers'
`scoreData` (`tournamentBoard`); it omits race, lineups, and `paidCount`.
Subjects are empty (no Stream @mentions). Prompt assembly skips the shared
contest event→result narrative pattern and the stage overlay. Intensity is
`routine` (~40–70 words); priority is low (~40).

### Score swing (event → result)

`score_swing` is the primary live beat. It watches contest-owned golfers for
new outsize hole results (birdie-or-better, double-bogey-or-worse) **and** for
position-bonus moves that happen without a new outsize hole from that golfer
(field reshuffles the tournament board—including after the golfer has finished):

- Eagle-or-better, hole-in-one, and double-bogey-or-worse always qualify when owned.
- Plain birdies qualify only when an owning lineup moves **four or more contest
  places** (`CONTEST_FEED_PLAIN_BIRDIE_MIN_POSITION_DELTA`) or **crosses the
  paid cut** (a cosmetic +1–3 place / +2 score tick is not enough).
- **Bonus-only:** prior fingerprint exists, `|bonusDelta| > 0`, and no new
  outsize hole this tick → `kind: "bonus_only"`, `cause: "field"`.
- Hole events with a non-zero `bonusDelta` set `cause: "self"` (this golfer’s
  hole moved the board). Hole events with `bonusDelta === 0` omit cause.
- The fact pack carries `events` and `impacts` (contest moves); it does not
  include the full contest `race` scoreboard.
- Each event includes tournament board/bonus context when available:
  `previousLeaderboardPosition`, `leaderboardPosition`, `previousBonus`, `bonus`,
  and `bonusDelta` (position bonus is 10 / 5 / 3 for 1st / 2nd / 3rd).
- Dual storyline for copy: TV/tournament drama is leaderboard position; this
  feed is contest commentary. Board moves matter here when they hit position
  bonuses, which then move contest scores. Path: tournament board context →
  bonus (when impactful) → contest consequence.
- Causal chain: self = hole → board/bonus → contest impact; field = board/bonus
  reshuffle → contest impact (never invent a hole). Skip flat or cosmetic board
  moves and never narrate a zero-bonus beat.
- Copy density: ordinal holes (“the 8th”); do not explain birdie/eagle/double;
  avoid contest-total and place-by-place laundry lists; name the golf/bonus
  result once, then the contest consequence once for shared owners. Do not pad
  with “gains a contest spot” filler for a plain place move; vary sentence
  structure across posts (synonym swaps of the same skeleton still count as
  repetition against `RECENTLY_PUBLISHED`).
- Score-swing priority includes a capped race-impact bump so material birdies
  (multi-place / paid-cut) more often land in `notable` or `major` intensity.
- `lastHoleState` fingerprints completed holes plus each golfer's
  `leaderboardPosition` and `bonus` so the next pass can compute deltas.
- The first pass after deploy seeds `lastHoleState` without emitting swings.

Each feed item also carries `round` (tournament period from the analysis
context) so clients can label which round the comment applies to.

Legacy `race_shakeup` and `leverage_spike` items may still appear in stored
feeds but are no longer emitted. Ownership is fixed after lock, so leverage
deltas are not a live feed signal.

### Narrative pattern: event → result

Live feed updates treat tournament player scoring or board movement as the
**event** and contest movement as the **result**. Copy should read
causally—golfer score or board/bonus change first, then what it does to a
user's position, ownership edge, or paid-cut status. Consequence-first openings
are allowed when the sentence still reads causally. Mention position bonus only
when `bonusDelta` is non-zero; cosmetic place changes and zero-bonus beats stay
out of the copy. Never invent hole results, board places, or bonus points beyond
the supplied fact pack. Never write “leverage” or quote internal ownership
analytics as numbers; at most one numeric contest-score pair per item.

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

When `CONTEST_COMMENTARY_ENABLED=true` and `CURSOR_API_KEY` is configured:

1. **Detect (score path):** after each live score + lineup sync, golf
   `afterLiveScoreSync` runs `detectAndEnqueueContestFeed` — classify against
   `lastContext` / `lastHoleState`, advance fingerprints immediately, and
   enqueue a `CommentaryFeedJob` when candidates exist (no Cursor on this path).
2. **Feed worker:** in-process loop (concurrency 1) claims jobs, generates story
   copy via Cursor from frozen fact packs, merges into `Contest.commentaryFeed`,
   and publishes Stream items.
3. **Overview (`*/20`):** `refreshContestOverviews` refreshes the legacy
   `Contest.commentary` snapshot when missing or at least 20 minutes old. Feed
   items are not generated here. Overview and the feed worker share an LLM
   single-flight lock.

Generation failures leave previous values intact. Use
`script:contest-feed <contestId> --classify` to inspect candidates without
writing.

The contest lobby API includes the latest commentary snapshot, feed document,
and generation timestamps. The client exposes the snapshot from the Winner Pool
information panel.

When `STREAM_FEEDS_ENABLED=true`, new feed items are also published to GetStream
(`contest:{contestId}`) for realtime lobby delivery, reactions, and mention
unread badges. See [docs/platform/stream-feeds.md](../../docs/platform/stream-feeds.md).
