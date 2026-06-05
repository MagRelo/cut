# Product growth funnel — Play The Cut

How a new user is expected to move from **first touch** to **repeat, high-value play**. This is a **product and measurement** reference: stage definitions, what “good” looks like, and where teams usually watch for drop-off. It pairs with the numeric engagement tiers in [`ECONOMICS_SKETCH.md`](./ECONOMICS_SKETCH.md).

---

## Why a funnel at all

Growth teams usually separate:

- **Acquisition** — they showed up and have an identity in the system.
- **Activation** — they did the **minimum set of actions** that predict they understood the product and can generate value (for you and for them). For a paid contest product, that almost always includes **at least one paid contest entry**, not just signup.
- **Revenue** — repeat entries, higher buy-ins, Winner Pool, etc.
- **Retention** — they come back for the **next** tournament week or season without you re-acquiring them.
- **Referral** (later) — they bring others; only worth optimizing once the core loop is healthy.

Drop-off between stages is normal. The product job is to **shorten time-to-value**, **remove surprise** (especially around money and crypto), and **give a clear next step** at each stage.

---

## End-to-end stages

Stages are listed in the **typical** order. Real users may **fund before** they finalize a lineup, or **browse contests** before funding; the definitions below still apply.

| # | Stage | User state | Product job | Primary success signals |
|---|--------|------------|-------------|-------------------------|
| **1** | **Signup & access** | Account exists; can log in; legal and basics done. | Make signup fast; set expectations (fantasy + contests, blockchain where relevant). | Completed registration; verified email (if used); session stable. |
| **2** | **Orientation** | They understand *this week’s* tournament and how contests relate to it. | Clear “where am I in the season?” and paths to lineups and contests. | Viewed tournament or contest context; optional: started onboarding checklist. |
| **3** | **Lineup created** | At least one **saved lineup** (named, four players, tied to the event). | Low-friction builder; save progress; explain scoring in one glance. | `first_lineup_created` (or equivalent); lineup associated with current tournament. |
| **4** | **Account funded** | Balance (or allowance) sufficient for **intended** buy-in + buffer for fees/gas. | Transparent funding steps; show **minimum to play**; reduce fear of mistakes. | Deposit or transfer completed; **available balance ≥** smallest meaningful entry + gas guidance met. |
| **5** | **First contest entry** | At least one **paid entry** of a lineup into a contest. | Match lineup to contest; show fee, prize idea, and lock rules; confirm success. | `first_contest_entry`; escrow or chain state reflects entry. |
| **6** | **Core loop repeat** | Second and third entries (same or new week), possibly second lineup. | Reminders tied to **tournament schedule**; “your lineups in contests” hub; easy re-entry. | Entries in **multiple** weeks; second lineup (optional milestone); increasing entries per month. |
| **7** | **Depth & expansion** | More lineups, higher buy-ins, **Winner Pool** participation. | Surface appropriate contests; educate Winner Pool without blocking primary path. | Multiple lineups active; entries at higher buy-in tier; first secondary / Winner Pool action. |
| **8** | **Habit & retention** | Returns without a full re-onboarding each cycle. | Email / push / in-app hooks for **lock times** and **round milestones**; post-contest results. | **Return next tournament**; rolling 4-week entry count; lower churn vs. one-and-done cohorts. |
| **9** | **Referral & advocacy** | Invites friends or shares results. | Referral program, share cards, league invites—**after** steps 5–6 work well. | Invite sent; referred user hits stage 5; or organic social proof. |

Stages **5–8** are where [`ECONOMICS_SKETCH.md`](./ECONOMICS_SKETCH.md) personas (breadth of lineups, entries per week, buy-in) attach to **concrete product goals**.

---

## Definitions that keep teams aligned

- **Activated user (recommended):** user who completes **stage 5** (first paid contest entry). Signup and lineup alone are **leading indicators**, not activation, for revenue planning.
- **Funded but not entered:** high-intent cohort; worth dedicated prompts (“You’re funded—pick a contest”) and support.
- **Entered once, never returned:** measure **time to second entry** and **week-over-week** re-entry; this separates product-market fit issues from acquisition quality.

---

## Common friction points (where funnels leak)

1. **Crypto and custody** — unfamiliar users stall between stages 4 and 5. Mitigations: copy that states total cost, links to funding help, and a **low buy-in** path for first entry.
2. **Tournament timing** — contests lock on a schedule. If orientation does not explain **when** things close, users miss the window and churn before stage 5.
3. **Lineup vs. contest confusion** — users build a lineup but never attach it to a contest. The product should make **“Enter contest”** the obvious next action after save.
4. **Winner Pool before primary loop** — secondary markets are compelling but can distract before **first entry**. Prefer introducing Winner Pool after **stage 5** or for users who already browse contests.

---

## Lightweight metrics map (examples)

| Stage | Example metric | Notes |
|-------|------------------|--------|
| 1 | Registrations / week | By channel if you track marketing. |
| 2 | % registrants who view tournament or contest list | Proxy for comprehension. |
| 3 | % registrants with ≥1 lineup | Lineup completion rate. |
| 4 | % of lineups that have a funded account behind the user | Funding conversion. |
| 5 | **Activation rate** = % registrants with ≥1 entry | North-star denominator is often “signups in period.” |
| 6–7 | Entries per active user / month; lineups per user | Aligns with economics sketch tiers. |
| 8 | % of users with entry in **week N+1** after first entry | Classic retention curve. |
| 9 | Invites or referred activations | Lagging; optimize last. |

Exact event names should match your analytics schema; the **stage table** is the contract across product, growth, and data.

---

## Summary

The funnel is **signup → context → lineup → funds → first entry → repeat play → depth (lineups, buy-in, Winner Pool) → habit → referral**. Treat **first contest entry** as activation for anything revenue-related; everything before that is **getting the user ready** without overstating success. Use [`ECONOMICS_SKETCH.md`](./ECONOMICS_SKETCH.md) to translate healthy **repeat** behavior into fee and persona expectations.

---

*Internal product reference — not a commitment to roadmap or OKRs.*
