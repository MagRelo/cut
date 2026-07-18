# Realistic Contest Outlook

The decisive-candidates report produces commentary-oriented PGA contest
outlooks. It estimates plausible lineup and golfer leverage from generic PGA
scoring outcomes. It does not claim mathematical elimination or model
player-specific skill.

Run a contest report:

```sh
pnpm --filter server run script:analyze-decisive-candidates <contestId>
```

Run every contest for an event:

```sh
pnpm --filter server run script:analyze-decisive-candidates --event <eventId>
```

Optional flags:

- `--simulations <100–10000>` controls scenario count. Default: `2000`.
- `--seed <number>` makes scenario sampling reproducible. Default: `2026`.
- `--weight <number>` overrides the sport popularity weight.

## Generic golfer model

Historical `EventParticipant.scoreData.r1`–`r4` hole arrays calibrate anonymous
outcome frequencies for par-3, par-4, and par-5 holes. The model recomputes
paired Stableford and stroke-to-par outcomes from each persisted par and gross
score; migrated aggregate totals are not used for calibration.

The scoring space matches production:

- Albatross or better: `+15`
- Hole-in-one: `+10`
- Eagle: `+5`
- Birdie: `+2`
- Par: `0`
- Bogey: `-1`
- Double bogey or worse: `-3`

Every active golfer samples from the same distributions. Current score, current
leaderboard position, holes completed, cut status, and rounds remaining differ
between golfers; skill, form, course fit, weather, and player history do not.
The current round's unplayed holes and every future regulation round are
included. `CUT` and `WD` golfers receive no future holes.

When historical calibration is unavailable, the package uses a conservative
built-in generic distribution over the same scoring outcomes.

## Scenario scoring

Each seeded scenario:

1. Samples a paired Stableford and stroke result for every remaining hole in
   the full event field.
2. Projects the round-two cut when the event has not reached round three.
3. Recomputes final leaderboard positions and the `+10/+5/+3` finishing bonus.
4. Applies the made-cut bonus.
5. Re-scores every contest lineup through the configured popularity rules.
6. Ranks the full contest with the production prediction and entry-time
   tiebreakers.

Shared picks move every owning lineup in the same scenario. A trailing lineup's
combined remaining roster opportunity is therefore modeled directly instead
of being compared with a global score slack.

## Lineup outlooks

`lineupOutlooks` is sorted by payout probability, then current position. Each
row contains:

- Current score, position, and gap to the paid cut
- Projected 10th-percentile, median, and 90th-percentile scores
- Scenario win and payout frequencies
- A conversational outlook tier

Tiers:

- `favorite`: the lineup with the highest nonzero payout frequency
- `in_the_hunt`: payout frequency of at least 15%
- `outside_shot`: payout frequency of at least 2%
- `effectively_out`: payout frequency below 2%

`contention.entryIds` contains every lineup above the `effectively_out`
threshold, including the favorite. This is a **plausible contention set**, not a
proof of mathematical possibility.

## Decisive golfers

`decisive` contains golfers owned by some, but not all, contest lineups and
whose generic remaining outcomes vary.

- `likelyRemaining` is the 10th/50th/90th percentile of sampled remaining
  Stableford points.
- `payoutSwing` is the difference between owner payout rates in the golfer's
  hot and cold scenario quartiles.
- `ownerPayoutWhenCold` and `ownerPayoutWhenHot` expose those component rates.
- `affectedEntryIds` and `affectedUserNames` identify the owners.
- `holesLeft` includes the current-round remainder and future rounds.

`consensus` is the inverse view of decisiveness: golfers whose outcomes matter
less to relative standings because they are shared across the plausible
contention set. A golfer qualifies when at least half of plausible contenders
own him, with at least two owners. `consensusStrength` combines that shared
ownership with the inverse of the same hot-versus-cold `payoutSwing` used by
the decisive ranking. Higher values mean “many contenders have him, and his
good or bad scenarios do relatively little to separate them.”

A majority-owned golfer may appear in both lists: he can be broadly shared
while still separating the minority of lineups without him. Universal contest
ownership removes him from `decisive` entirely.

## Confidence and commentary

The report is designed to support phrases such as “in the hunt,” “has an
outside shot,” and “could swing the payout race.” Do not translate its output
into claims that a lineup is mathematically alive or eliminated.

Confidence is strongest late in round four, when fewer generic outcomes remain.
Earlier reports include cut and future-round uncertainty and should be framed
as a broad contest outlook. Numerical probabilities are internal heuristics;
user-facing copy should prefer tiers, score bands, named lineups, ownership,
and the golfers creating separation.

The CLI emits:

- Calibration sample counts
- Missing participant-total warnings
- Persisted-versus-recomputed lineup score drift
- The deterministic seed and simulation count

Warnings should be resolved or reflected in commentary before publication.
