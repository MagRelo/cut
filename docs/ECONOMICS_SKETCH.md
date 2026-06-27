# Economics sketch — Play The Cut

Working model for **platform fee revenue** from primary contests and Winner Pool (secondary) activity. **Primary and secondary each use a 7% take** in all figures below. Cash amounts are in **USD** ($).

Personas are framed like a **funnel**: how many **lineups** we push someone toward, how many **contest entries per week** we want them making on those lineups, and the **highest buy-in** we’re comfortable nudging them toward at that stage. Monthly spend **S** is still **entries × buy-in** over the month (below we use **entries/week × ~4 weeks**).

## Definitions

| Term | Meaning |
|------|--------|
| **Contest primary handle** | All entry money in one contest: **entrants × buy-in** (contest-level). |
| **User primary spend (monthly), S** | **This user’s** total entry fees in the month: **(contest entries in the month) × (buy-in per entry)**. |
| **Secondary handle** | **Winner Pool** notional (contest-level), or in the tables **m × S** as side-market activity vs. that user’s entry spend. |
| **Take rate** | **7%** on primary inflow and **7%** on secondary inflow. |

**Per contest:**

```
Fee_primary   = 0.07 × Contest primary handle
Fee_secondary = 0.07 × Secondary handle
```

**Contest-level:** secondary volume vs. the entry pool:

```
Secondary handle (contest) ≈ m × Contest primary handle
```

Example: **m = 0.25** means total Winner Pool volume is **25%** of that contest’s entry money.

**Persona-level:** **m** compares that user’s implied Winner Pool stakes to **S**—not to field size.

---

## Example buy-ins and one contest

Assume **20 entrants** per contest (scale linearly with entrant count).

| Buy-in | Contest primary handle | Fee @ 7% (primary) | If m = 0.5, secondary handle | Fee @ 7% (secondary ex.) | **Total fee ex.** |
|-------:|----------------------:|-------------------:|-----------------------------:|-----------------------:|------------------:|
| $10 | $200 | $14 | $100 | $7 | **$21** |
| $50 | $1,000 | $70 | $500 | $35 | **$105** |
| $200 | $4,000 | $280 | $2,000 | $140 | **$420** |

If secondary is quiet (**m = 0.1**), multiply the secondary column by **0.2**; if hot (**m = 1.5**), multiply by **3**.

---

## Engagement funnel (weekly targets)

**Lineups / week** = how many distinct lineups we want in active play in a typical week (breadth). **Contest entries / week** = total entries across those lineups (depth). **Stretch buy-in** = the high end of contest price we encourage at that stage.

| Persona | Lineups / week | Contest entries / week | Stretch buy-in | ≈ Entries / month (×4 wks) |
|---------|---------------:|-----------------------:|---------------:|---------------------------:|
| **Casual** | 1 | 1 | $10 | 4 |
| **Regular** | 2 | 2.5 | $20 | 10 |
| **Serious** | 3 | 3.75 | $50 | 15 |
| **Power** | 6 | 15 | $50 | 60 |

**Casual** — One lineup rhythm, one entry a week, lowest buy-in tier.

**Regular** — Two lineups in rotation; a little more than one entry per lineup per week on average; step up to **$20** contests.

**Serious** — Three lineups; closer to **~4 entries/week** across them; anchor on **$50** contests.

**Power** — Full portfolio (**6** lineups), **15 entries/week**, same **$50** stretch buy-in but maximum volume.

---

## Monthly revenue model (per user)

**S** = **contest entries in the month × buy-in**. Here **entries/month ≈ (entries/week) × 4**. Platform fee:

```
0.07 × S  +  0.07 × m × S  =  0.07 × (1 + m) × S
```

| Persona | Contest entries / mo | Buy-in | m | **S** | ~Platform fee / mo |
|---------|---------------------:|-------:|--:|------:|-------------------:|
| **Casual** | 4 | $10 | 0.15 | $40 | $3 |
| **Regular** | 10 | $20 | 0.43 | $200 | $20 |
| **Serious** | 15 | $50 | 0.52 | $750 | $80 |
| **Power** | 60 | $50 | 0.66 | $3,000 | $349 |

Rough cohort: **100 users** at the **Regular** funnel tier → on the order of **~$2,000** / month in platform fees.

---

## Platform-scale view

**H_tot** = sum of all users’ primary entry inflow in the period.

```
Monthly primary fee   ≈ 0.07 × H_tot
Monthly secondary fee ≈ 0.07 × m_avg × H_tot
```

**m_avg** = book-wide ratio of secondary volume to primary (volume-weighted).

**Example:** H_tot = **$500,000** / month, m_avg = **0.4**:

- Primary fees ≈ **$35,000**
- Secondary fees ≈ **$14,000**
- **Combined ≈ $49,000** / month

---

## Observed economics (production counterpoint)

The sections above are a **forward model** — personas, funnel targets, and scale math. This section records what **actually happened** on production over an 8-week PGA window (**2026-05-02 → 2026-06-27**, eight tournaments) so we can compare theory to data and refine targets.

**Scope:** Base Sepolia (`chainId` 84532), xUSDC (6 decimals). **27** unique users with at least one paid contest lineup in the window. Contest platform fees come from **`referralNetworkBps` (700 = 7%)** on gross TVL at settlement (primary + secondary), aligned with the sketch’s 7% take. Side bets are a **separate rail** (stakes to `VITE_SIDE_BET_STAKE_RECIPIENT`); they are **not** in the sketch formulas above.

### What we measured

| Metric | Indexed (DB) | Adjusted estimate |
|--------|-------------:|------------------:|
| Platform income (8 weeks) | ~$122 | ~$157–$202 |
| Platform income / MAU / month | ~$2.40 | ~$3.10 |
| Primary TVL / MAU / month | ~$37 | ~$37 |
| Contest fee as % of primary TVL | ~6.5% blended | ~7% when secondary included |

**Platform income** = oracle’s share of contest referral-network fees (indexed `OnchainPayment` kind `REFERRAL` to `ORACLE_ADDRESS`) **plus** net side-bet P&L on **settled** tickets (stake minus estimated payout). User-to-user referral shares are pass-through, not platform income.

**Adjusted** adds estimated May contest fees that settled on-chain but were **not indexed** in `OnchainPayment` until June (primary TVL × 7%). June indexed amounts match settlement snapshots closely (e.g. RBC Canadian: $170 gross → $11.90 fee; U.S. Open: $413.85 gross → $31.15 fee).

### Sketch vs observed personas

| Lens | Sketch | Observed (8-week window) |
|------|--------|--------------------------|
| Monthly primary spend **S** | Casual $40; Regular $200 | **~$37** (≈ Casual) |
| Secondary attach **m** | Casual 0.15; Regular 0.43 | **Near 0** in practice (few secondary participants) |
| Contest platform fee / MAU / mo | Casual **$3**; Regular **$20** | **~$3** indexed; **~$3.10** adjusted |
| Side bets | Not modeled | ~$17 net on ~$215 settled handle (volatile by week) |

Live cohort behavior maps to the sketch **Casual** tier, not **Regular**. The gap to Regular is mostly **entry frequency** and **Winner Pool attach**, not take rate or buy-in (paid contests were mostly **$20** entry).

Weekly revenue per **that week’s active entrant** swung from about **−$3.70** (PGA Championship — side bets lost) to **+$5.25** (Memorial) because side-bet P&L is lumpy; contest fees are the stabler core.

### Bridge persona: Light Regular ($10 ARPU)

For planning between today’s data and the sketch **Regular** row, treat **$10 / MAU / month** (contest fees only) as a near-term stretch target:

```
0.07 × (1 + m) × S ≈ 10
```

Example that closes the gap without jumping straight to Regular volume: **~5 entries / month × $20 buy-in**, **m ≈ 0.43** (Regular-level secondary) → **~$10/mo** platform fee.

| Persona | Sketch fee / mo | Role |
|---------|----------------:|------|
| Casual | $3 | **Observed today** |
| **Light Regular** | **$10** | Planning bridge (~half Regular depth + real secondary) |
| Regular | $20 | Sketch growth cohort (100 users → ~$2,000/mo) |

At **$10 ARPU**, the sketch headline “100 users → ~$2,000/mo” becomes **~200 users** for the same MRR; at sketch **Regular ($20)**, 100 users still holds.

### Scale targets at $10 ARPU (contest fees; side bets upside)

| Milestone | MRR | MAUs @ $10/mo |
|-----------|----:|--------------:|
| Ramens / proof | $2,000 | ~200 |
| Indie ~$100K gross / yr | $8,300 | ~830 |
| Seed traction | $20,000 | ~2,000 |
| Seed strong | $50,000 | ~5,000 |
| Series A floor ($1M ARR) | $85,000 | ~8,500 |

Founder **~$100K net / yr** (lean solo, after tax and light opex) implies roughly **$12–15K MRR** gross → **~1,200–1,500 MAUs** at $10 ARPU, or **~700–1,000 MAUs** if ARPU reaches sketch Regular ($20).

### Weekly fund-flow reference (same window)

Platform income by tournament week (indexed; May contest fees under-counted):

| Week of | Tournament | Active entrants | Platform income | Income / active entrant |
|---------|------------|----------------:|----------------:|------------------------:|
| 2026-05-04 | Truist | 19 | $0 | $0 |
| 2026-05-11 | PGA Championship | 17 | −$63 | −$3.73 |
| 2026-05-18 | Byron Nelson | 11 | $35 | $3.18 |
| 2026-05-25 | Charles Schwab | 10 | −$32 | −$3.21 |
| 2026-06-01 | Memorial | 11 | $58 | $5.25 |
| 2026-06-08 | RBC Canadian | 13 | $33 | $2.57 |
| 2026-06-15 | U.S. Open | 17 | $46 | $2.70 |
| 2026-06-22 | Travelers | 9 | $45 | $5.00 |

*Active entrant* = unique user with a contest lineup that week. Blended over the period: **~$0.56–0.73 / MAU / week** when spread across 27 MAUs (not all play every week).

### Levers the data highlights

1. **Retention / entries per month** — largest gap vs sketch Regular; moving Casual → Light Regular is ~3× ARPU.
2. **Winner Pool (m)** — sketch assumes meaningful secondary; production was minimal; fee is on **gross TVL**, so secondary moves the needle when it exists (U.S. Open week).
3. **Side bets** — material week-to-week variance; treat as margin upside, not the core model until payout rail and book depth mature.
4. **Free contests** — zero primary **S** and zero platform fee; mix dilutes cohort ARPU.
5. **Indexing** — use on-chain settlement events or snapshot gross for May-era contests when reconciling platform revenue; DB `OnchainPayment` alone understates contest fees before ~June 2026.

### How to use both sections

| Use the sketch (above) for… | Use this counterpoint for… |
|-----------------------------|----------------------------|
| Persona design and funnel targets | Whether users behave like those personas today |
| Take-rate and buy-in sensitivity | Validating 7% on real settlement TVL |
| Scale math at Regular / Serious | Conservative MAU counts and ARPU floors |
| Investor “what if we execute the funnel” | Operator “what we earned last month” |

Revisit this table quarterly or after major product changes (real-money rail, secondary growth, side-bet settlement automation, multi-sport).

---

*Internal use — not financial advice.*
