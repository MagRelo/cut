# Wallet roles and ops cashflows

Operational inventory of **platform wallets / keys** on Base — organized by ops bucket. Use this to coordinate funding, key custody, and mainnet cutover.

Related: [referral-network.md](../platform/referral-network.md) · [economics-sketch.md](../internal/economics-sketch.md) · [cron-pi.md](cron-pi.md) · [contracts/env.example](../../contracts/env.example) · [client/.env.example](../../client/.env.example) · [server/.env.example](../../server/.env.example)

**Chain:** Base mainnet `8453` for production; Base Sepolia `84532` for staging. Contest prize money stays in **ContestController** escrow — winners claim (or oracle push-payout) from the contract. Payment token is **canonical Base USDC** on mainnet and **MockUSDC (xUSDC)** on Sepolia.

**User wallets** (Privy smart wallets) are not platform roles; they are listed only where cashflows touch them. User gas sponsorship (e.g. paymaster) is a **USD opex** line — not a wallet role here.

There are exactly **two platform keys**:

```text
DEPLOYER_PK      Infra / Deployer  — one-time ETH spend; then cold
OPS_ORACLE_PK    Cron-Ops OPS_ORACLE — contest + referral oracle in one EOA; leaks ETH, accrues paymentToken
```

(Marketing_test side-bet wallets are a paymentToken ledger, not a signing key held by the app.)

---

## 1. Infra — Deployer (`DEPLOYER_PK`)

**Shape:** One-time (or rare) deploy expense. Fund with **ETH**, run `Deploy_base.s.sol` (or Sepolia), then treat as a **cold wallet** unless you leave it as long-lived contract owner (see below). No ongoing prize or side-bet custody.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Deployer** | Broadcasts forge scripts; inherits contract ownership | Yes — `contracts/.env` `DEPLOYER_PK` | Deploy time only | TBD |

| Asset | Direction | Notes |
|-------|-----------|-------|
| ETH | Out (one-time) | Deploy (+ optional verify / retries / ownership transfers) |
| Payment token | None | Deployer is not a settlement destination |

Env: `contracts/.env` → `DEPLOYER_PK`, `OPS_ORACLE_PK` (its address becomes the ReferralGraph oracle), `REFERRAL_GROUP_ID`, RPC.

### Deploy cost estimate (Base mainnet)

`Deploy_base` creates **three** contracts in one broadcast: ContestFactory, ReferralGraph, RewardCalculator. Creation bytecode is large (ContestFactory alone ~20 KB) — most of the fee is **L1 data**, which tracks Ethereum congestion.

| Scenario | Rough ETH | Rough USD (at ~$2–3k ETH) |
|----------|-----------|---------------------------|
| Quiet L1 / happy path | **~0.001–0.005 ETH** | **~$2–15** |
| Busy L1 or retries | **~0.005–0.02 ETH** | **~$15–50** |

**Practical fund:** put **0.02 ETH** on the deployer EOA for mainnet cutover (covers deploy + a couple retries + `transferOwnership` txs). Sepolia is cheap/test ETH. Re-estimate before go-live with `forge script … --estimate` — fees move with L1.

### Roles the deployer inherits

From `Deploy_base.s.sol` as written today (`initialOwner = deployer`; the ReferralGraph oracle is the **`OPS_ORACLE_PK` address**, falling back to the deployer only if `OPS_ORACLE_PK` is unset):

| Cap / role | Contract | Deployer gets it? | What it can do | Keep on deployer? |
|------------|----------|-------------------|----------------|-------------------|
| **`owner`** | `ReferralGraph` | **Yes** (constructor `initialOwner`) | `authorizeOracle` / `unauthorizeOracle`, `transferOwnership` | Maybe — admin capability; often move to a multi-sig / cold Ops admin after cutover |
| **Authorized referral oracle** (`REFERRAL_GROUP_ID`) | `ReferralGraph` | **No** if `OPS_ORACLE_PK` is set (its address is authed instead) | `register` / `batchRegister` / skiplist (oracle paths) | **No** — this belongs to OPS_ORACLE, not the cold deployer |
| **ContestFactory owner** | `ContestFactory` | **No** | Factory is not Ownable; anyone can `createContest` | N/A |
| **ContestController oracle / host** | Per contest | **No** (not set by deploy script) | Lifecycle / settle | Set at `createContest` → **OPS_ORACLE** (`VITE_ORACLE_ADDRESS`) |
| **MockUSDC owner** (Sepolia only) | `MockUSDC` | **Yes** on `Deploy_sepolia` | `mint` / `burn` | Sepolia faucet-style; not a mainnet role |

**Implication:** Deployer **will** be Ownable admin of `ReferralGraph` unless you transfer afterward. As long as `OPS_ORACLE_PK` is set at deploy, the deployer is **not** the referral oracle. Contests never assign the deploy key as contest oracle by default.

Post-deploy options:

1. **Cold deployer keeps ownership** — rare ops; deploy key must stay safe forever for `authorizeOracle` / rescue.
2. **`transferOwnership` → multi-sig / Ops admin** — recommended if ownership stays in play.
3. **Renounce ownership** — only if you are sure you will never need to rotate the OPS_ORACLE authorization.

### Open

- [ ] Document deployer address for the Base mainnet deploy.
- [ ] Decide **owner disposition** after deploy: keep cold / multi-sig / renounce.
- [ ] Set `OPS_ORACLE_PK` at deploy so its address (not the deployer) is the authorized referral oracle on mainnet.

---

## 2. Cron-Ops — OPS_ORACLE (`OPS_ORACLE_PK`)

**Shape:** One hot key on web + cron hosts ([cron-pi.md](cron-pi.md)) that is **both the contest oracle and the referral oracle**. Compromising it = full contest and referral control.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **OPS_ORACLE** | Contest: create / activate / lock / settle / close; push primary/secondary payouts. Referral: authorized on `ReferralGraph` for `REFERRAL_GROUP_ID`, `register` / `batchRegister`, and tree root under `REFERRAL_ROOT` | Yes — server + cron | `OPS_ORACLE_PK` (address derived, or pin `OPS_ORACLE_ADDRESS`); client `VITE_ORACLE_ADDRESS` | TBD |

The OPS_ORACLE address must match `OPS_ORACLE_PK`, the on-chain contest `oracle`, the authorized `ReferralGraph` oracle, the referral tree root, and client `VITE_ORACLE_ADDRESS`.

### Balance model

| Asset | Direction | Why |
|-------|-----------|-----|
| **ETH** | **Leaks** (ongoing out) | Gas for contest lifecycle txs and referral `register` / `batchRegister` |
| **Payment token** | **Accumulates** (ongoing in) | Ancestor slice of referral-network fees when the oracle is on the winner’s payout chain (indexed `OnchainPayment` kind `REFERRAL` to the oracle) |

```text
                    ETH ──spend──► settle / register / push txs
User ──deposit──► ContestController
                      │
                      ├─ settleContest → prizes (claim/push to users)
                      └─ referralNetworkBps → RewardCalculator split
                                              ├─ user referrers
                                              └─ oracle ancestor ──paymentToken──► OPS_ORACLE wallet
```

Contest escrow itself is **not** OPS_ORACLE balance — users move payment token in/out of controllers. OPS_ORACLE only needs **ETH float** for gas and will **accrue paymentToken** from referral ancestor fees over time (platform income core; see [economics-sketch.md](../internal/economics-sketch.md) and [referral-network.md](../platform/referral-network.md)).

### Ops funding

| Need | Practice |
|------|----------|
| ETH | Keep warm enough for a busy settle week + referral sync batch; top up when low |
| Payment token | No pre-fund required; optionally sweep accrued fees to cold / operating accounts on a schedule |

Env: `server/.env` / cron / swarm → `OPS_ORACLE_PK` (optional `OPS_ORACLE_ADDRESS`), RPC; client → `VITE_ORACLE_ADDRESS`, `VITE_REFERRAL_GROUP_ID`.

**Open:** Confirm mainnet OPS_ORACLE address; fund with Base ETH before cutover.

---

## 3. Marketing_test — Side-bet in / out

**Shape:** A **paymentToken ledger** only — no meaningful ETH role beyond optional outbound-tx gas if ops sends payouts from `out`. Separate from contest escrow and the OPS_ORACLE key.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Side-bet in** | Receives stake on place | Receive-only preferred (no app key) | `VITE_SIDE_BET_STAKE_RECIPIENT` | `0x6569E9BA175fA46FFf13bc649E0D92813E507a06` |
| **Side-bet out** | Pays WON / void refunds after admin settle | Yes if sending | **Open** — no dedicated env; manual today | TBD |

### Ledger model

```text
User stake (paymentToken) ──► in
                              │
Admin grades (WON / LOST / VOID)
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
out ──paymentToken──► winner / refund          retained on in (LOST)
```

| Line | Asset | Meaning |
|------|-------|---------|
| **In** | Payment token ↑ | Ticket stakes (`fundingTxHash`) |
| **Out** | Payment token ↓ | Payouts / voids after settle |
| **Net** | Payment token | Settled handle P&L ≈ stakes retained − payouts |

Treat **in** and **out** as ledger columns (same EOA or two wallets — decide below). Size **out** float to cover open WON liability; sweep net from **in** on a cadence. Grading is admin (`POST /api/admin/bets/side/settle`); chain payout not automated yet.

Env: client `VITE_SIDE_BET_STAKE_RECIPIENT`; server `SIDE_BETS_ENABLED` (+ DataGolf for quotes).

**Open:** out ≡ in or separate hot wallet; payout automation vs manual; weekly in/out reconciliation.

---

## Address register

| Bucket | Role | Env key | Base Sepolia | Base mainnet |
|--------|------|---------|--------------|--------------|
| Infra | Deployer | `DEPLOYER_PK` | | |
| Cron-Ops | OPS_ORACLE (contest + referral + root) | `OPS_ORACLE_PK` | | |
| Marketing_test | Side-bet in | `VITE_SIDE_BET_STAKE_RECIPIENT` | | `0x6569E9BA175fA46FFf13bc649E0D92813E507a06` |
| Marketing_test | Side-bet out | — | | |

Never commit private keys. Addresses only in this doc; keys only in sealed env / secrets managers.
