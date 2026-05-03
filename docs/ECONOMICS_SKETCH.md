# Economics sketch — Bet the Cut

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

*Internal use — not financial advice.*
