# Contest Commentary: Number Discipline and Rhythm Variety

Two changes to the PGA contest commentary feed: keep internal analytics out of the
published copy, and make the cadence of feed items vary with the size of the event
they describe.

Scope is PGA (`packages/sport-pga-golf`) plus the server generation path.
Commodities parity is deferred.

## Baseline measurements

Taken from all 72 stored `Contest.commentaryFeed` items (before removing
`leverage_spike`).

| Story type | n | Words (mean ± sd) | Observed range | Allowed band | Sentences |
| --- | --- | --- | --- | --- | --- |
| `score_swing` | 54 | 72.5 ± 7.7 | 57–90 | 50–100 | 52 of 54 are 3–5 |
| `leverage_spike` | 14 | 60.1 ± 4.4 | 51–70 | 40–80 | mean 3.4 |
| `stage_recap` | 4 | 154.5 ± 9.3 | 140–164 | 125–175 | mean 8.3 |

Repeated diction across all items: "swing" 39%, "board" 28%, "loud" 26%,
"paid cut" 24%, "surge" 21%, "vault" 21%, "move day" 19%, "chaos" 18%.

Internal metrics in copy: 16 of 72 items use the word "leverage"; 3.3 bare
numbers per item; 25 of 72 use a raw `X to Y` contest-total run.

## Completed Tasks

- [x] Audit stored feed output and quantify the rhythm and number-leak problems
- [x] Remove `leverage_spike` from the active feed classifier (ownership does not
  change while live commentary runs)
- [x] Add a `METRIC_DISCIPLINE` block to the always-on output contract forbidding internal analytics in copy
- [x] Remove "leverage" from the prompt's own copy vocabulary so the model stops treating it as a broadcast word
- [x] Cap score_swing at one numeric contest-score pair per item
- [x] Derive a `storyIntensity` tier and thread it from classifier to prompt
- [x] Replace fixed word bands with intensity-resolved bands, shared by prompt and validator
- [x] Pass recent feed text into the prompt as a do-not-reuse list
- [x] Loosen the mandated beat order while keeping the event → result causal rule
- [x] Rotate a deterministic style directive per item
- [x] Replace the voice's fixed joke quota with a range and permission to play it straight
- [x] Fix the dropped `round` label in the frozen-story generation path (use job payload period)
- [x] Extend prompt and classifier unit tests
- [x] Update `CONTEST_COMMENTARY.md`
- [x] Regenerate a sample against a live contest (dry-run) and re-check baseline metrics

## In Progress Tasks

_(none)_

## Completed verification sample (2026-08-01)

Dry-run against live contest `cms2eh6w300058abba4lxxy6o` (Rocket Classic),
forcing candidates in memory — **not persisted**.

| Item | Intensity | Words | Band | Notes |
| --- | --- | --- | --- | --- |
| score_swing | notable | 46 | 45–75 | Near floor; old mean was 72.5 |
| stage_recap | major | 173 | 150–200 | Within band |

- **Leverage mentions:** 0 (was 16/72 historically)
- **Score-run pairs (`X to Y`):** 0
- **Word SD across the two items:** 63.5 (vs score_swing historical sd 7.7 within-type)
- Live classify with current fingerprints still returns 0 candidates (expected when nothing new has happened)

## Implementation summary

Active feed story types: `score_swing` and `stage_recap` only. Historical
`leverage_spike` items still parse.

Copy rules: never write "leverage"; never quote ownership analytics as numbers;
at most one contest-score pair per item. Fact-pack JSON still includes metrics
for model reasoning.

Rhythm: candidates carry `intensity` (`routine` | `notable` | `major`);
`resolveContestFeedWordLimits` selects the band; prompts get intensity tone,
style rotation, and recent-phrasing avoidance. Voices allow straight routine
updates without a closing zinger.

Frozen path: `generateFeedItemsFromFrozenStories` prefers `options.period`
(from the job payload) for `item.round`.

### Relevant Files

- `packages/sport-pga-golf/src/contestCommentaryPrompt.ts`
- `packages/sport-pga-golf/src/contestFeed.ts`
- `packages/sport-sdk/src/contestCommentaryVoices.ts`
- `server/src/sports/pga-golf/commentary/generateContestFeed.ts`
- `server/src/sports/pga-golf/commentary/processCommentaryFeedJob.ts`
- `packages/sport-pga-golf/CONTEST_COMMENTARY.md`
