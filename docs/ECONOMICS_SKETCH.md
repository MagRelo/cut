# Economics sketch — Bet the Cut

Working model for **platform fee revenue** from primary contests and Winner Pool (secondary) activity. **Primary and secondary each use a 7% take** in all figures below. Amounts are **CUT notional** (treat as roughly dollars if CUT tracks ~1:1).

## Definitions

| Term | Meaning |
|------|--------|
| **Contest primary handle** | All lineup entry money in one contest: **entrants × buy-in** (contest-level). |
| **User primary spend (monthly)** | What **this user** pays in entry fees for the month: **contests entered × buy-in per lineup**, assuming **one lineup per contest** unless you add a lineups multiplier. |
| **Secondary handle** | **Winner Pool** notional (contest-level), or in the persona tables **m × user primary spend** as a stand-in for side-market activity vs. entries. |
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

**Persona-level:** use that user’s spend **S** only. **m** compares their secondary stakes to **S**—not to contest field size.

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

Single-user **platform fee** per calendar month (7% on primary + 7% on secondary applied to **S** and **m × S** as below).

| Persona | What they look like | ~Platform fee / month |
|---------|---------------------|----------------------:|
| **Casual** | A couple of contests, low buy-in, barely touches the Winner Pool. | **~2** |
| **Regular** | **Buy-in 20**, on the order of **~11 contests** per month; Winner Pool is present but secondary (**m ≈ 0.30**). | **~20** |
| **Serious** | **Buy-in 50** (same stake as Power), heavy calendar; Winner Pool scales with entries (**m ≈ 0.52**). | **~149** |
| **Power** | **Buy-in 50** like Serious, **many more contests**, deeper Winner Pool (**m ≈ 0.64**). | **~350** |

**Casual** — Low frequency and stakes; **m = 0.15** → only **~13%** of fee from Winner Pool.

**Regular** — Mostly entry-fee revenue; Winner Pool **~23%** of fee.

**Serious** — Primary vs. secondary fee roughly **2:1** at **m ≈ 0.52**.

**Power** — Large monthly **S**; secondary **~40%** of fee at **m ≈ 0.64**.

Rough cohort: **100 Regular users** → on the order of **~2,000** CUT/month in platform fees.

---

## User-level projections (monthly)

**S** = contests/month × buy-in (one lineup per contest). Fee per user:

```
0.07 × S  +  0.07 × m × S  =  0.07 × (1 + m) × S
```

| Persona | Contests / mo | Buy-in | m | User primary spend **S** / mo | ~Platform fee / mo (CUT) |
|---------|---------------:|-------:|--:|------------------------------:|-------------------------:|
| Casual | 2 | 10 | 0.15 | 20 | 2 |
| Regular | 11 | 20 | 0.30 | 220 | 20 |
| Serious | 28 | 50 | 0.52 | 1,400 | 149 |
| Power | 61 | 50 | 0.64 | 3,050 | 350 |

If users often enter **multiple lineups** per contest, multiply **S** by lineups per contest.

---

## Platform-scale view

**H_tot** = sum of all users’ primary entry inflow in the period.

```
Monthly primary fee   ≈ 0.07 × H_tot
Monthly secondary fee ≈ 0.07 × m_avg × H_tot
```

**m_avg** = book-wide ratio of secondary volume to primary (volume-weighted).

**Example:** H_tot = **500,000** CUT/month, m_avg = **0.4**:

- Primary fees ≈ **35,000**
- Secondary fees ≈ **14,000**
- **Combined ≈ 49,000** CUT/month

---

*Internal use — not financial advice.*
