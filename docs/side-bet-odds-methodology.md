# Side-bet odds methodology

How we turn per-player finish odds into the **3×3 grid** (`2/3/4 of 4` × `Top 5/10/20`) on a lineup. Covers **pricing math and assumptions** only (not cron, ingestion timing, or settlement ops).

| | |
|---|---|
| **Current implementation** | `server/src/services/odds/calculateRoundRobinOdds.ts` |
| **Recommended replacement** | § [Recommended model](#recommended-model-at-least-k-under-independence) below |

---

## What the bet pays (grading rule)

| Row | Wins when |
|-----|-----------|
| 2 of 4 | ≥ 2 of the four golfers finish in top **N** (ties count) |
| 3 of 4 | ≥ 3 of the four finish in top **N** |
| 4 of 4 | all four finish in top **N** |

Columns: **N ∈ {5, 10, 20}**.

**Pricing must target this event.** The current code prices a different (stricter) event and then averages — see § [Current method](#current-method-legacy-mean-of-k-leg-parlays).

---

## Inputs

For each lineup player, three decimal prices from DataGolf outrights (`top_5`, `top_10`, `top_20`):

| Field today | Role |
|-------------|------|
| `bovada` | Used in production ingest |
| `datagolf.baseline` | De-vigged model price; available via `pickBaselineDecimal()` but unused for the grid |

Join: PGA Tour id → DataGolf `dg_id` → outrights row. Missing any leg for any player → no grid for that lineup.

---

## Current method (legacy): mean of k-leg parlays

For row **“k of 4”** and column **Top N**:

1. Enumerate all C(4, k) subsets of players.
2. For each subset, **multiply** that subset’s Top N decimals (k-leg parlay: *all k in the subset* must hit).
3. **Arithmetic mean** of those combo decimals → published price.

```
D_cell = (1 / C(4,k)) × Σ_{|S|=k}  Π_{i∈S} d_i
```

No extra house margin on top of the mean.

### Why this is wrong for the bet (and generous)

| | Settlement | Legacy pricing |
|---|------------|----------------|
| Logic | **OR**: any ≥ k players can hit | **AND** within each combo, then **mean** of combos |
| Example 3 of 4 | Win if S,R,X **or** S,R,C **or** … (4 ways) | Averages “S+R+X all hit”, “S+R+C all hit”, … |

Win probability for “at least k” is much **higher** than the probability that one *named* k-subset all hits. Averaging k-leg parlay decimals still leaves the quote far **too long** (bettor-favorable) for k = 2 and k = 3.

**4 of 4** is the exception: only one subset, so the mean of one product equals a straight 4-leg parlay — aligned with the bet.

### Worked example: Top 5 · 3 of 4 (plan players)

Player Top 5 decimals: 2.20, 2.40, 2.80, 3.20.

| Subset | Parlay product |
|--------|----------------|
| S+R+X | 14.7840 |
| S+R+C | 16.8960 |
| S+X+C | 19.7120 |
| R+X+C | 21.5040 |

**Legacy published:** mean = **18.224** → **+1722**

---

## Recommended model: “at least k” under independence

### Step 1 — Per-player implied probability

From each player’s decimal \(d_i\) for the relevant Top N market:

\[
p_i = \frac{1}{d_i}
\]

**Input choice (conservative stack):**

| Priority | Source | Rationale |
|----------|--------|-----------|
| Preferred | `datagolf.baseline` | De-vigged; avoids baking book margin into every leg twice |
| Acceptable | `bovada` | Simpler; leg vig tends to **inflate** each \(p_i\) slightly → **higher** \(P(\geq k)\) → **shorter** offered odds vs baseline (house-friendlier), but less principled |

Do **not** use mean of parlay decimals as a proxy for \(P(\geq k)\).

### Step 2 — Win probability (matches grading)

Assume independent finish events (see § [Correlation](#correlation-same-tournament)). For exactly four players, enumerate all \(2^4\) hit/miss patterns:

\[
P(\text{win}) = \sum_{\text{mask}} \mathbf{1}[\text{hits}(\text{mask}) \geq k] \cdot \prod_{i:\text{hit}} p_i \cdot \prod_{i:\text{miss}} (1 - p_i)
\]

This is the standard binomial-style sum over disjoint outcomes; it prices **“at least k of 4”** directly.

### Step 3 — Fair decimal

\[
D_{\text{fair}} = \frac{1}{P(\text{win})}
\]

For **4 of 4**, this collapses to \(1 / (p_1 p_2 p_3 p_4)\) — same as a 4-leg parlay product on probabilities (then invert), consistent with legacy for that row only.

### Step 4 — House margin (non-generous)

Apply an explicit edge so published odds are **shorter** than fair:

\[
D_{\text{publish}} = \frac{1}{P(\text{win}) \cdot (1 + m)}
\]

where \(m\) is a configured margin (e.g. **5–10%**). Tune from desired hold / empirical calibration.

- Larger \(m\) → lower decimal → less payout → more conservative.
- Cap or floor policy may be needed for very high \(P(\text{win})\) cells (e.g. 2 of 4 · Top 20 can approach even money under independence).

### Reference implementation sketch

```ts
function probAtLeastK(probs: number[], k: number): number {
  let pWin = 0;
  const n = probs.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let hits = 0;
    let pr = 1;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        hits++;
        pr *= probs[i]!;
      } else {
        pr *= 1 - probs[i]!;
      }
    }
    if (hits >= k) pWin += pr;
  }
  return pWin;
}

function publishDecimal(probs: number[], k: number, margin: number): number {
  const p = probAtLeastK(probs, k);
  const pAdj = Math.min(p * (1 + margin), 0.9999);
  return 1 / pAdj;
}
```

---

## Numeric comparison (plan example lineup)

Same four players as `SIDE_BET_PRODUCTION_PLAN.md`. **Independence** column uses \(p_i = 1/d_i\) from Bovada decimals. **House +8%** applies \(D = 1 / (P \cdot 1.08)\).

### Top 5

| Row | Legacy (mean parlay) | P(win) indep. | Fair indep. | House +8% | Legacy / House |
|-----|---------------------|---------------|-------------|-----------|----------------|
| 2 of 4 | +597 (6.97) | 50.0% | +100 (2.00) | −108 (1.85) | **3.8×** longer |
| 3 of 4 | +1722 (18.22) | 16.1% | +522 (6.22) | +476 (5.76) | **3.2×** longer |
| 4 of 4 | +4631 (47.31) | 2.1% | +4631 (47.31) | +4280 (43.80) | 1.08× (margin only) |

### Top 10

| Row | Legacy | P(win) | Fair indep. | House +8% |
|-----|--------|--------|-------------|-----------|
| 2 of 4 | +367 | 63.8% | −176 (1.57) | −190 (1.45) |
| 3 of 4 | +903 | 26.3% | +280 (3.80) | +251 (3.51) |
| 4 of 4 | +2048 | 4.7% | +2048 | +1886 |

### Top 20

| Row | Legacy | P(win) | Fair indep. | House +8% |
|-----|--------|--------|-------------|-----------|
| 2 of 4 | +112 | 90.8% | −987 (1.10) | −1047 (1.02) |
| 3 of 4 | +208 | 63.1% | −171 (1.58) | −185 (1.47) |
| 4 of 4 | +348 | 22.3% | +348 | +315 |

**Takeaways**

- Legacy is dramatically generous for **2 of 4** and **3 of 4** (often 3×+ in decimal).
- **Min combo** (shortest parlay among subsets) is still far too long for 3 of 4 Top 5 (+1378 vs +476 with margin) — not a sufficient fix.
- **4 of 4** is already structurally correct; only margin and input source matter.

---

## Correlation (same tournament)

Independence is a modeling assumption, not truth. Same-week finishes are **positively correlated** (course conditions, form, weak field spots, etc.): if one lineup player runs hot, others are somewhat more likely to as well.

| Effect | Direction |
|--------|-----------|
| Positive correlation | **Increases** \(P(\geq k)\) vs independence |
| Independence-only | **Understates** \(P(\geq k)\) → **longer** odds → **generous** to bettors |

So independence + margin is not automatically “house safe”; for a conservative product you may need one or more of:

1. **Explicit margin** \(m\) large enough to cover correlation slack (calibrate on history).
2. **Correlation bump**: e.g. common-factor or Gaussian copula on latent “week strength” (more accurate, more work).
3. **Cap long shots**: max decimal per cell so tail risk is bounded (product rule).
4. **Hide or widen** cells where \(P(\text{win})\) is very high under any model (2 of 4 · Top 20).

Document chosen policy in config (`SIDE_BET_PRICING_MARGIN`, optional `SIDE_BET_MAX_DECIMAL`).

---

## What not to do

| Approach | Issue |
|----------|--------|
| Mean of k-leg parlay decimals | Prices wrong event; very generous for k = 2, 3 |
| Min of combo decimals | Still prices “one named subset all hits”; still generous |
| Max of combo decimals | Even more generous |
| Mean of combo **probabilities** | Still not \(P(\geq k)\); ignores overlap of winning outcomes |
| Parlay then average without margin | No house edge |

---

## Suggested rollout

1. **Implement** `probAtLeastK` + `publishDecimal` in `calculateRoundRobinOdds.ts` (or sibling module).
2. **Switch ingest** to `pickBaselineDecimal` (fallback to Bovada if baseline missing).
3. **Add** `SIDE_BET_PRICING_MARGIN` (start ~8%; review after live tickets).
4. **Update tests** — replace plan example expectations (e.g. Top 5 · 3 of 4 → ~+476 with 8% margin, not +1722).
5. **Optional**: max decimal, suppress cells above win-prob threshold, correlation v2.

---

## Display conversion (unchanged)

`decimalAmerican.ts`: American / English strings from final `D_publish`.

**American → decimal** (external normalization):

- If American > 0: `decimal = 1 + (american / 100)`
- If American < 0: `decimal = 1 + (100 / |american|)`

**Decimal → American** (display):

- If `D ≥ 2`: `american = +(D − 1) × 100` (rounded)
- If `D < 2`: `american = −100 / (D − 1)` (rounded)

---

## Tests

`server/src/services/odds/calculateRoundRobinOdds.test.ts` currently locks legacy Top 5 · 2 of 4 (+597). When switching models, add cases for:

- \(P(\geq k)\) enumeration vs known small examples,
- 4 of 4 equivalence to product of four leg decimals (pre-margin),
- margin monotonicity (higher \(m\) → lower decimal),
- baseline vs Bovada input fixture if both supported.
