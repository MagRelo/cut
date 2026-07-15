# Decisive Candidates Report Metrics

Output of `analyzeDecisiveCandidates` in [`src/decisiveCandidates.ts`](./src/decisiveCandidates.ts).  
CLI: `pnpm --filter server run script:analyze-decisive-candidates <contestId>`

## Top-level fields

| Field | Type | Meaning |
|-------|------|---------|
| `contestId` | string | Contest analyzed |
| `eventId` | string | Competition event for the contest |
| `period` | number \| null | Event `currentPeriod` (1–4 regulation; ≥401 playoff). Analysis is most useful in R4 when remaining capacity is small |
| `paidCount` | number | How many places pay (`defaultPayoutVector`: 1 if &lt;10 entries, else 3) |
| `contention` | object | Lineups still mathematically in the paid race (see below) |
| `decisive` | array | Differentiating candidates sorted by leverage (highest `flipShare` first) |
| `consensus` | array | Candidates owned by **every** contention lineup — move totals equally, not relative standings |
| `notes` | string[] | Human-readable caveats (e.g. early round, all players finished) |

---

## `contention`

The set **S** of lineups whose remaining scores can still decide paid outcomes.

| Field | Meaning |
|-------|---------|
| `entryIds` | Contest entry IDs in S (score ≥ `cutScore - slackUsed`) |
| `slackUsed` | Points allowed below the paid cut. Default = `max(minSlack=8, max remaining among picks on current paid-place lineups)`. Override with `--slack` |
| `leaderScore` | Highest lineup score in the contest |
| `cutScore` | Score of the current Nth place (`N = paidCount`) — the paid cut |
| `paidCount` | Same as top-level `paidCount` |

**Read:** A wider S early in R4 (large remaining) is expected; late R4 S shrinks as `slackUsed` collapses toward the floor.

---

## `decisive[]` (differentiators)

Candidates owned by **some but not all** of S. Only these can change relative order via their remaining points.

| Field | Meaning |
|-------|---------|
| `eventParticipantId` | DB id for the pick target |
| `displayName` | Golfer display name |
| `ownership` | `"k/n"` — owned by *k* of *n* contention lineups |
| `ownersCount` | *k* |
| `contentionSize` | *n* = `\|S\|` |
| `holesLeft` | Unplayed holes on the current round scorecard (null stableford slots) |
| `maxRemaining` | Optimistic upper bound: `holesLeft × maxPtsPerHole` (default 4). `0` = finished / WD / CUT — no future flip from this player alone |
| `minSwingToFlip` | Smallest extra points *R* (&gt; 0) that changes the **winner** or **paid-set** when added only to owners. `null` if no *R* in `0…maxRemaining` flips outcomes |
| `flipShare` | Fraction of remaining outcomes `R ∈ {0…maxRemaining}` where winner or paid-set differs from the *R = 0* baseline. Higher = more decisive. `0` when finished or margins are already locked |
| `affects` | Per contention entry: `entryId`, `positionNow` (rank within S today), `owns` (whether that lineup has this golfer) |

**Interpretation tips**

- High `flipShare` + small `minSwingToFlip` → watch this player now.
- High ownership (e.g. `4/5`) with low `flipShare` → almost consensus; little relative leverage left.
- `maxRemaining === 0` → structural ownership only; the swing already happened (or never will).

---

## `consensus[]`

| Field | Meaning |
|-------|---------|
| `eventParticipantId` | DB id |
| `displayName` | Golfer name |
| `ownership` | Always `"n/n"` for contention size *n* |
| `reason` | Usually `"owned by all contention lineups"` |

These golfers still matter for absolute scores / narrative (“everyone’s Scheffler”), but **not** for who beats whom inside S.

---

## What is *not* in the report

- Joint multi-player outcomes (univariate sweep only — a lower bound on importance)
- Stroke-play / DataGolf finish probabilities
- Side bets or secondary market

---

## Prompt: report → tight paragraph

Paste this when summarizing CLI / analyzer JSON into user-facing copy:

```
You are summarizing a Play The Cut golf contest “decisive candidates” JSON report.

Write one tight paragraph (3–5 sentences) for a contest lobby or Sunday watchlist.

Rules:
- Lead with the race shape: how many lineups are in contention, paid places, and the score band (leader / cut / slack) in plain language.
- Name at most 2–3 decisive golfers by displayName. Prefer highest flipShare, then lowest minSwingToFlip. Mention ownership (e.g. “2 of 5 contention lineups”) and whether they still have holes left.
- If consensus golfers exist, mention one as shared / not differentiating — don’t list everyone.
- If notes say players are finished (maxRemaining=0) or period < 4, say the report is structural / early, not a live must-watch.
- Skip raw IDs, flipShare decimals, and entryIds unless essential. No bullet lists. No hype.
- Do not invent scores, holes, or golfers not in the JSON.

JSON:
```

Append the report JSON after the prompt.
