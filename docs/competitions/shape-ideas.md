# Competition shape — executive summary & ideas

**Audience:** External — partners and collaborators exploring what kinds of competitions fit the platform.

Brainstorm doc for **any** pick-and-rank competition that fits Play The Cut’s engine — not only traditional sports. Use with [fit-guide.md](fit-guide.md) to score fit before technical planning.

**Status:** In progress — ideas to explore, not a roadmap.

---

## Executive summary

Play The Cut is a **discrete-event lineup competition platform**. The implementation still says “sport,” but the product shape is broader:

> **Pick a small roster from a bounded field → each pick earns a number → numbers aggregate into one lineup score → lineups rank in paid or league contests until the event ends.**

That pattern fits anything with:

- A **named event** (this week’s race, this episode’s eliminations, this month’s market window)
- A **finite candidate pool** users can browse before lock
- **Objective or rule-based scoring** that collapses to one total per participant
- A **clear finish** so contests can settle within hours, not months

It does **not** require athletics. It requires **enumerable competitors and countable outcomes**.

Leagues work when friend groups already run informal pools (“our office does the Oscars,” “our Discord does the weekly stock challenge”). Cross-domain leagues are a feature: one group can run golf, stocks, and reality TV in the same season.

**Best opportunities** combine recurring cadence, public data, live-moving leaderboards, and existing social pool culture.

**Platform-native competitions** — formats invented and run on Play The Cut (no external feed) — are a separate bucket: community lists, promo tournaments, and **predict-the-consensus** challenges where lineup picks *are* the data source. See [fit-guide.md — Platform-native competitions](fit-guide.md#platform-native-competitions).

---

## The shape in one line

| Step | Generic | Golf example | Non-sport example |
|------|---------|--------------|-------------------|
| Domain | Competition type | PGA Golf | Weekly stock picks |
| Event | One instance | Masters week | Q1 2026 · Week 12 |
| Pool | Who’s in play | 87 golfers | 50 large-cap tickers |
| Lineup | User’s picks | 4 golfers | 5 stocks |
| Score | Sum of pick totals | Stableford sum | % return sum |
| Contest | Paid or league pool | $20 league pool | Office portfolio pool |
| Tie-break | Pre-event prediction | Winning score | S&P close prediction |

---

## Fit filter (30 seconds)

Ask before any idea gets serious:

1. Can we **list the field** before lock?
2. Does each pick produce **one number** per event?
3. Is **sum (or simple aggregate)** a fun game?
4. Is there a **weekly / daily / weekend** rhythm?
5. Can we **source results** without hand-waving?
6. Would a **league of friends** run this repeatedly?

Mostly yes → worth a one-pager. No on 1–3 → wrong tool or needs reframing.

Full worksheet: [fit-guide.md](fit-guide.md).

---

## Idea brainstorm

Grouped by domain. **Fit** is directional (Strong / Stretch / Hard) against the platform shape — not an implementation estimate.

### Motors & endurance

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **F1 race weekend** | Sat–Sun | 20 drivers | Points by finish + fastest lap bonus | Strong | Reframe season as weekends, not championship |
| **NASCAR cup race** | Single race | ~40 drivers | Finish position points | Strong | Same as golf rhythm on Sundays |
| **Rally stage day** | Day of stages | Crews / drivers | Stage time points | Stretch | Data niche; drama if timed updates exist |
| **Boston Marathon** | Race day | Elite field | Finish place / time buckets | Stretch | Pool smaller; updates sparse until finish |
| **Tour de France stage** | One stage | Peloton riders | Stage points + bonus | Stretch | Multi-day event = one “active event” per stage |

### Markets & prediction (quantified picks)

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **Weekly stock portfolio** | Mon open – Fri close | Curated tickers or S&P 500 subset | Sum of % return (or weighted) | Strong | Office pools exist; APIs abundant; 5-min refresh enough |
| **Crypto weekly slate** | 7-day window | Top 50 coins | Sum % move | Strong | Volatile = live drama; compliance careful |
| **Earnings week** | Week of reports | Companies reporting | Beat/miss points + move % | Stretch | Field changes daily; needs “reporting this week” filter |
| **Fed meeting day** | FOMC day | Macro “participants” (indices, bonds, gold) | Portfolio return that day | Stretch | Tiny pool; event very short |
| **Fantasy economics** | Monthly jobs day | Labor-market indicators | Distance from consensus | Hard | Pool isn’t people; reframing awkward |

### Awards, culture & reality TV

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **Oscars / Emmys** | Ceremony night | Nominees by category | Points per win (pick N nominees) | Strong | Huge office pools; field fixed; scores update live |
| **Eurovision** | Final night | Countries | Placement points | Strong | Same as awards |
| **Survivor / Bachelor** | Season slice = episode week | Cast still on island/show | Elimination survival points + episode events | Stretch | Season-long show → **episode week** as event |
| **The Voice / Idol** | Episode | Contestants | Advance / performance points | Stretch | Judge scores often subjective |
| **Love Island daily** | Episode | Couples / islanders | Coupling + vote-out events | Hard | Cadence fast; field churn messy |

### Games, esports & skill

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **CS2 / LoL match day** | Tournament day | Pro teams or players | K/D, map wins, fantasy pts | Strong | Esports = sports-shaped; APIs exist |
| **Chess tournament round** | Round day | GMs in event | Performance / Elo gain | Stretch | Smaller audience; clear scoring |
| **Poker final table** | Session | Players | Chip count / placement | Stretch | Live updates possible; niche |
| **Speedrunning marathon** | GDQ block | Runners + games | Time vs par / donations optional | Stretch | Event boundaries fuzzy |
| **Spelling bee** | National bee day | Spellers | Round reached / words correct | Stretch | Dramatic but elimination-heavy; reframe as round-by-round points |
| **Crossword tournament** | Day | Solvers | Completion time / accuracy | Hard | Obscure data; low league repeat |

### Politics & civic (handle carefully)

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **Primary night slate** | Election night | Races on ballot | Delegates / call points | Stretch | Legal/compliance; results batch not live |
| **Debate night** | Single debate | Poll movers or prediction-market proxies | Post-debate poll delta | Hard | Subjective; delayed scoring |

### Animals, niche & local

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **Westminster / dog show** | Show day | Breeds or dogs | Group / Best in Show placement | Stretch | Fun league flavor; annual cadence |
| **Horse racing card** | Track day | Horses across races | Finish points per race | Stretch | Aggregation across races needs clear rules |
| **Fantasy fishing tournament** | Tournament | Anglers | Bag weight / placement | Stretch | Bass tour = golf-shaped |
| **Hot dog eating contest** | July 4 | Eaters | Count eaten | Hard | One day/year; tiny pool |

### Science & novelty

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **NASA launch week** | Launch window | Payload / mission milestones | Checkpoint points | Hard | Binary outcomes; low repeat |
| **Weather week** | Mon–Sun city | Cities | Temp / rain vs forecast | Stretch | Pick cities; score vs actual — fun office game |
| **Wordle week** | 7 puzzles | Friends as “participants” | Score from friend stats if shared | Hard | Privacy; not public field |

### Platform-native

| Idea | Event unit | Pool | Scoring sketch | Fit | Notes |
|------|------------|------|----------------|-----|-------|
| **Predict the consensus** | Multi-day entry window | 20–50 staff-seeded items | Points by pick frequency in the contest at lock | Strong | Crowd-as-score (path 2) — not ownership modulation on external feeds; see [consensus-axis.md](../platform/consensus-axis.md) |
| **Community vote slate** | Multi-day vote window | 20–50 seeded items | Points by final rank from votes | Stretch | Requires vote storage, moderation, Sybil controls |
| **League nomination pool** | League-scoped week | Member nominations → curated | Consensus or admin-final rank | Stretch | Ops-heavy; good v2 extension of consensus format |

---

## Platform-native: predict the consensus

A platform-native format where users pick items they believe **other entrants will pick** from a curated pool. Scoring derives from aggregate lineup data at lock — not an external API and not a separate voting channel.

**One-liner:** *Pick the four albums you think everyone else will pick.*

This is **path 2 (crowd-as-score)** in [consensus-axis.md](../platform/consensus-axis.md). Pick frequency *is* `e_i`. There is no second ownership-modulation layer on top — that dial applies only to external-signal sports (golf, F1, etc.).

### How it maps to the engine

| Concept | Consensus native |
|---------|------------------|
| Pool | Staff-seeded list (albums, restaurants, memes, nominees) |
| Lineup | N picks from the pool before lock |
| Per-pick score | Points from **pick frequency** in the contest at lock |
| Lineup score | Sum of pick totals (default aggregation) |
| Tie-break | Predict pick rate (%) of the #1 most popular item |
| Data source | Locked `ContestLineup` + `LineupPick` rows — no vote table |
| Score source | **Crowd** — rank-based points from pick frequency at lock |
| Ownership modulation | **N/A** — not the same as golf's `uniquenessWeight` dial |

Same pick → aggregate → rank flow as golf. The sport plugin’s `syncLiveScores` computes pick rates from contest entries instead of calling an external API. Do not add `uniquenessWeight` on top — ownership already defines each pick's score.

### Scoring (rank-based, v1 default)

At lock, per contest:

1. Count how many lineups include each pool item
2. Rank items by pick count (ties broken deterministically, e.g. seed order)
3. Most picked → 10 pts, 2nd → 9 pts, … unranked → 0
4. Lineup score = sum of its picks’ points

Alternative: raw pick rate (`round(lineupsWithPick / totalLineups × 100)`) — more granular but noisy in small contests. Rank-based points match the F1/golf points feel and are easier to explain.

### Lifecycle

Consensus events are front-loaded: the interesting phase is **before lock**, not a multi-day live window.

| Phase | Platform status | Behavior |
|-------|-----------------|----------|
| Entry open | `SCHEDULED` | Users build lineups and join contests; field is fixed |
| Lock | Contest activates | Pick rates computed once; lineup scores written |
| Reveal | `LIVE` (optional, short) | Leaderboard visible; no edits |
| Final | `COMPLETE` | Settle contests |

Many events can go lock → settle in one cron pass with no extended `LIVE` period.

### Pick-rate visibility (product knob)

| Mode | UX | Tradeoff |
|------|-----|----------|
| **Hidden until lock** | Pure prediction; blank leaderboard until reveal | Best for competitive integrity |
| **Live during entry** | Show `% of entries` per item in the picker | Herding drama; last-minute pile-ons before lock |

Event metadata can declare `showPickRates: "never" | "afterMinEntries" | "always"`. The platform already passes `ownershipPercentage` into `ParticipantRow` — pick rate is the same display pattern.

### Why this over voting

| Concern | Voting format | Consensus format |
|---------|---------------|------------------|
| Data infra | Vote table, tally sync | Query existing lineup picks |
| Sybil | Separate voter identity | Same contest-entry controls as any paid contest |
| Moderation | Nomination review, bad votes | Field is staff-seeded |
| Ops at lock | Admin publish final ranks | Scores derive automatically from locked lineups |

Admin work: seed the field, write the prompt, set lock time.

### Implementation notes

- **Per-contest scoring:** pick rates differ between a league contest (12 entries) and a public contest (200 entries). `aggregateLineupScore` may need `contestId` passed through; v1 can constrain to one contest per native event.
- **Minimum entries:** require a floor (e.g. 5) before computing consensus so pick rates are meaningful.
- **Suggested `sportId`:** `ptc-consensus` — one sport, many events with different prompts. Set `scoreSource: "crowd"` (or equivalent) so platform code skips path-1 ownership modulation.
- **Plugin checklist:** same as [add-sport-checklist.md](../../spec/platform/add-sport-checklist.md); Phase 1 spike proves pick-rate → rank → lineup score without any external API.

### Example v1: Crowd Reads

| Field | Decision |
|-------|----------|
| **Prompt** | Pick 4 albums you think most players will pick |
| **Pool** | 30 albums, staff-seeded Monday |
| **Lock** | Thursday 8pm ET |
| **Scoring** | Rank-based points from contest pick frequency |
| **Tie-break** | Predict #1 item’s pick rate (1–100) |
| **Cadence** | Weekly or biweekly; fills golf off-weeks |
| **League fit** | Social intuition, not domain expertise — casual members can play |

---

## Patterns that repeat

| Pattern | Why it works | Examples |
|---------|--------------|----------|
| **Weekend spectacle** | Clear event, live updates, social viewing | Golf, F1, Oscars, NASCAR |
| **Weekly cadence** | Habit + league ritual | Stocks, NFL, crypto, earnings |
| **Ceremony / reveal** | Scores jump in discrete chunks | Awards, Eurovision, draft lotteries |
| **Slate of peers** | Natural candidate pool | Stocks in index, nominees, drivers |
| **Office pool culture** | League-first acquisition | March Madness slice, Oscars, stocks |
| **Meta-prediction / crowd read** | Scores from entrant behavior, not external results | Predict the consensus; no API or vote infra |

| Anti-pattern | Why it fails |
|--------------|--------------|
| Year-long narrative | No discrete event |
| Subjective judging only | Disputes, delayed finals |
| Pick the winner only | No roster aggregation |
| Million-item universe | Picker unusable without heavy filters |
| Results unknowable for weeks | Contest can’t settle |

---

## Highest-signal ideas (top of stack)

Short list if expanding beyond golf **without** chasing novelty for its own sake:

1. **Weekly stock portfolio** — familiar office game, great data, Fri close settlement, league-friendly  
2. **NFL / NBA fantasy slates** — classic sports shape, huge audience  
3. **Oscars / major awards** — annual tentpole, fixed field, perfect live night  
4. **F1 / NASCAR weekend** — sports-adjacent, Sunday drama  
5. **Esports match day** — young audience, sports-shaped APIs  
6. **Eurovision / reality episode week** — social viewing + recurring episodes if sliced right  

Each passes the fit filter with less reframing than spelling bee or weather games.

**Platform-native top pick:**

7. **Predict the consensus** — staff-seeded culture lists, scores from contest pick frequency at lock, no external data or voting infra, strong league fit for off-week engagement

---

## League angle

Leagues (`UserGroup`) are cross-domain social containers — a friend group can run golf, stocks, and Oscars pools in the same league. Each contest is tied to one event; the domain is a label on the card (e.g. “PGA · Masters”), not a global mode users must switch.

Implications for new ideas:

- **Oscars + golf + stocks** in one league is coherent when each is an event-scoped contest
- Domains with **annual cadence** (Oscars) pair well with **weekly** domains (stocks, golf) in the same group
- Domains that need heavy explanation (unusual scoring) are harder for casual league members

---

## Naming note

Code and schema use `Sport`, `sportId`, `SportModule`. Product copy can say **competition**, **game**, or **category** while plugins remain technically “sport modules.” A stock-pick domain might be `weekly-markets` with display name “Stock Showdown” — no architecture change required.

---

## Next step for any idea

Copy the competition brief template in [fit-guide.md](fit-guide.md) and fill one page. If two sentences can explain the lineup score to a friend, schedule a league dry-run with three people before building a plugin.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [fit-guide.md](fit-guide.md) | Fit worksheet, scoring questions, go/adapt/pass, platform-native |
| [architecture.md](../platform/architecture.md) | Plugin model, data schema |
