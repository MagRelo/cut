# Economics sketch — Bet the Cut

Short working model for **platform fee revenue** across buy-in tiers, primary contests, and Winner Pool (secondary) activity. **Throughout this document, primary and secondary use the same take rate: 7%.** Numbers are illustrative; replace assumptions when you have production averages.

## Definitions

| Term | Meaning |
|------|--------|
| **Contest primary handle** | All lineup entry money in one contest: **entrants × buy-in** (contest-level). Used in the single-contest example table below. |
| **User primary spend (monthly)** | What **this user** pays in entry fees for the month: **contests entered × buy-in per lineup**, assuming **one lineup per contest** unless you add a lineups multiplier. |
| **Secondary handle** | **Winner Pool** notional (contest-level: everyone’s wagers) or, in the persona sketch, **m × that user’s primary spend** as a simple stand-in for “their side-market activity vs. their entries.” |
| **Take rate** | **7%** on both **primary** (entries / contest pool) and **secondary** (Winner Pool inflow), same rate everywhere in this doc—aligned with product copy on contest fees. |

**Revenue per contest (illustrative):**

```
Fee_primary   = 0.07 × Contest primary handle
Fee_secondary = 0.07 × Secondary handle
```

**Contest-level:** secondary volume scales with the contest’s entry pool:

```
Secondary handle (contest) ≈ m × Contest primary handle
```

Example: **m = 0.25** means total Winner Pool volume is **25%** of that contest’s total entry money.

**Persona-level:** fee from **one user** uses their own spend **S**. Same **m** is read as “their secondary stakes vs. their own entry spend”—do not scale **S** by contest field size; that would mix **contest turnover** with **one wallet’s** contribution.

---

## Example buy-ins and one contest

Assume **20 entrants** per contest (scale linearly with entrant count).

| Buy-in (CUT) | Contest primary handle | Fee @ 7% (primary) | If m = 0.5, secondary handle | Fee @ 7% (secondary ex.) | **Total fee ex.** |
|-------------:|-----------------:|-------------------:|-----------------------------:|-----------------------:|------------------:|
| 10 | 200 | 14 | 100 | 7 | **21** |
| 50 | 1,000 | 70 | 500 | 35 | **105** |
| 200 | 4,000 | 280 | 2,000 | 140 | **420** |

If secondary is quiet (**m = 0.1**), multiply the secondary column by **0.2**; if hot (**m = 1.5**), multiply by **3**.

---

## Persona overview

These four personas are **single-user** illustrations: how much **platform fee** (primary + Winner Pool, each at **7%** in this sketch) one person might generate **per calendar month** if their play matches the row. Dollar equivalents depend on how CUT is priced; treat everything as **CUT notional**.

| Persona | What they look like | ~Platform fee / month |
|---------|---------------------|----------------------:|
| **Casual** | Dabbles: a couple of contests, low buy-in, barely touches the Winner Pool. | **~2** |
| **Regular** | Steady habit: **5 contests per month**, **avg buy-in 20**, meaningful but not huge secondary (**m = 0.35**). | **~9** |
| **Serious** | Core player: many contests, mid–high buy-in, Winner Pool about half as large as *their* entry spend (**m = 0.5**). | **~158** |
| **Power** | Heavy user: very active, high buy-in, strong Winner Pool participation (**m = 0.65**). | **~578** |

**Casual** — Low frequency and low stakes; with **m = 0.15**, only **~13%** of their small monthly fee comes from the Winner Pool slice of the model.

**Regular** — The “typical engaged” user: fee is still mostly primary, but Winner Pool adds a visible second line (**~26%** of total fee in this row).

**Serious** — Primary and secondary fees split closer to **2:1** on the primary side vs. secondary contribution at **m = 0.5**.

**Power** — Dominated by large monthly entry spend **S**. At **m = 0.65**, the Winner Pool fee line is about **two-thirds** of the primary fee line, and secondary is **~39%** of that user’s total monthly fee.

Full inputs (contests per month, buy-in, **m**) are in the table below. Multiply **~fee / month** by headcount for a rough cohort (e.g. 100 Regular users → on the order of **~900** CUT/month; same caveats on overlap / double-counting).

---

## User-level projections (monthly, illustrative)

Each row is a **persona**. **User primary spend** **S** = contests/month × buy-in (**one lineup per contest**). Platform fee from that user uses **7%** on their entry spend and **7%** on **m × S** (their implied Winner Pool stakes in this sketch).

| Persona | Contests / mo | Buy-in | m | User primary spend **S** / mo | ~Platform fee / mo (CUT) |
|---------|---------------:|-------:|--:|------------------------------:|-------------------------:|
| Casual | 2 | 10 | 0.15 | 20 | 2 |
| Regular | 5 | 20 | 0.35 | 100 | 9 |
| Serious | 15 | 100 | 0.50 | 1,500 | 158 |
| Power | 25 | 200 | 0.65 | 5,000 | 578 |

Formula (per user, per month):

```
0.07 × S  +  0.07 × m × S  =  0.07 × (1 + m) × S
```

Here **S** = that user’s monthly primary spend (not contest-wide handle). If they often submit **multiple lineups** per contest, multiply **S** by lineups per contest.

---

## Platform-scale view (many users)

At platform scale, **H_tot** is the **sum of all users’ primary entry inflow** in the period (everyone’s paid lineups), not one persona’s **S**.

Then:

```
Monthly primary fee   ≈ 0.07 × H_tot
Monthly secondary fee ≈ 0.07 × m_avg × H_tot
```

Here **m_avg** is a volume-weighted guess of how large Winner Pool is vs. primary across the whole book. (Do not confuse **H_tot** with a single user’s **S**.)

**Example:** H_tot = **500,000** CUT/month in **aggregate** entry fees, m_avg = **0.4** (same **7%** on primary and secondary):

- Primary fees ≈ **35,000**
- Secondary fees ≈ 0.07 × 0.4 × 500,000 ≈ **14,000**
- **Combined ≈ 49,000** CUT/month (before any fixed costs, gas abstraction, or treasury policy).

---

## What to validate next

1. **Exact base for the 7%** — all paid primary deposits vs. net prize pool only; align FAQ and contracts/oracle fee routing so one story matches the product (including that **Winner Pool fees match the same 7%** assumption if this doc is used for outward messaging).
2. **Real m** — from analytics: contest-level secondary handle ÷ contest primary handle, by field size and buy-in tier.

---

*Internal sketch — not financial advice. Assumes **7%** take on both primary and secondary for all figures here.*
