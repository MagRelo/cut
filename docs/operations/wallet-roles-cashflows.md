# Wallet roles and ops cashflows

Operational inventory of **platform wallets / keys** on Base — organized by ops bucket. Use this to coordinate funding, key custody, and mainnet cutover.

Related: [referral-network.md](../platform/referral-network.md) · [economics-sketch.md](../internal/economics-sketch.md) · [cron-pi.md](cron-pi.md) · [contracts/env.example](../../contracts/env.example) · [client/.env.example](../../client/.env.example) · [server/.env.example](../../server/.env.example)

**Chain:** Base mainnet `8453` for production; Base Sepolia `84532` for staging. Contest prize money stays in **ContestController** escrow — winners claim (or oracle push-payout) from the contract. Payment token is **canonical Base USDC** on mainnet and **MockUSDC (xUSDC)** on Sepolia.

**User wallets** (Privy smart wallets) are not platform roles; they are listed only where cashflows touch them. User gas sponsorship (e.g. paymaster) is a **USD opex** line — not a wallet role here.

```text
Infra            Deployer          — one-time ETH spend; then cold
Cron-Ops         Contest + referral oracles — leak ETH; accrue paymentToken
Marketing_test   Side-bet in/out   — paymentToken ledger only
```

---

## 1. Infra — Deployer

**Shape:** One-time (or rare) deploy expense. Fund with **ETH**, run `Deploy_base.s.sol` (or Sepolia), then treat as a **cold wallet** unless you leave it as long-lived contract owner (see below). No ongoing prize or side-bet custody.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Deployer** | Broadcasts forge scripts; may inherit contract ownership / default oracle auth | Yes — `contracts/.env` `PRIVATE_KEY` | Deploy time only | TBD |

| Asset | Direction | Notes |
|-------|-----------|-------|
| ETH | Out (one-time) | Deploy (+ optional verify / retries / ownership transfers) |
| Payment token | None | Deployer is not a settlement destination |

Env: `contracts/.env` → `PRIVATE_KEY`, `REFERRAL_ORACLE`, `REFERRAL_GROUP_ID`, RPC.

### Deploy cost estimate (Base mainnet)

`Deploy_base` creates **three** contracts in one broadcast: ContestFactory, ReferralGraph, RewardDistributor. Creation bytecode is large (ContestFactory alone ~20 KB; stack ~31 KB total) — most of the fee is **L1 data**, which tracks Ethereum congestion.

| Scenario | Rough ETH | Rough USD (at ~$2–3k ETH) |
|----------|-----------|---------------------------|
| Quiet L1 / happy path | **~0.001–0.005 ETH** | **~$2–15** |
| Busy L1 or retries | **~0.005–0.02 ETH** | **~$15–50** |

**Practical fund:** put **0.02 ETH** on the deployer EOA for mainnet cutover (covers deploy + a couple retries + `transferOwnership` txs). Sepolia is cheap/test ETH. Re-estimate before go-live with `forge script … --estimate` / a dry RPC quote — fees move with L1.

Blockscout / Basescan verification is usually free API-side (no on-chain spend).

### Roles the deployer inherits (or might)

From `Deploy_base.s.sol` as written today (`initialOwner = deployer`, `REFERRAL_ORACLE` defaults to deployer if unset):

| Cap / role | Contract | Deployer gets it? | What it can do | Keep on deployer? |
|------------|----------|-------------------|----------------|-------------------|
| **`owner`** | `ReferralGraph` | **Yes** (constructor `initialOwner`) | `authorizeOracle` / `unauthorizeOracle`, `transferOwnership` | Maybe — admin capability; often move to a multi-sig / cold Ops admin after cutover |
| **`owner`** | `RewardDistributor` | **Yes** (constructor `initialOwner`) | Same oracle auth + `transferOwnership` (and other owner-gated admin) | Same as graph — usually transfer with graph |
| **Authorized referral oracle** (`REFERRAL_GROUP_ID`) | Graph + Distributor | **Only if** `REFERRAL_ORACLE` unset (defaults to deployer) | `register` / `batchRegister` / skiplist (oracle paths) | **No** for steady state — set `REFERRAL_ORACLE` to **Cron-Ops** address at deploy so the hot oracle key holds this, not the cold deployer |
| **ContestFactory owner** | `ContestFactory` | **No** | Factory is not Ownable; anyone can `createContest` | N/A |
| **ContestController oracle / host** | Per contest | **No** (not set by deploy script) | Lifecycle / settle | Set at `createContest` → **Cron-Ops** (`VITE_ORACLE_ADDRESS`) |
| **MockUSDC owner** (Sepolia only) | `MockUSDC` | **Yes** on `Deploy_sepolia` | `mint` / `burn` | Sepolia faucet-style; not a mainnet role |

**Implication:** Deployer **will** be Ownable admin of the referral stack unless you transfer afterward. Deployer **might** also be the referral oracle if you forget `REFERRAL_ORACLE` — avoid that for mainnet. Contests never assign the deploy key as contest oracle by default.

Post-deploy options:

1. **Cold deployer keeps ownership** — rare ops; deploy key must stay safe forever for `authorizeOracle` / rescue.
2. **`transferOwnership` → multi-sig / Ops admin** — recommended if ownership stays in play.
3. **Renounce ownership** — only if you are sure you will never need to rotate referral oracles.

### Open

- [ ] Document deployer address for the Base mainnet deploy.
- [ ] Decide **owner disposition** after deploy: keep cold / multi-sig / renounce.
- [ ] Set `REFERRAL_ORACLE` = Cron-Ops (contest oracle) at deploy — do not leave default = deployer on mainnet.

---

## 2. Cron-Ops — Contest + referral oracles

**Shape:** Hot keys on web + cron hosts ([cron-pi.md](cron-pi.md)). Compromising these = full contest and referral control.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Contest oracle** | Create / activate / lock / settle / close; push primary/secondary payouts; usually also `register` / `batchRegister` | Yes — server + cron | `ORACLE_ADDRESS`, `ORACLE_PRIVATE_KEY`; client `VITE_ORACLE_ADDRESS` | TBD |
| **Referral oracle** | Authorized on `ReferralGraph` + `RewardDistributor` for `REFERRAL_GROUP_ID`; tree root under `REFERRAL_ROOT` | Optional separate key | Deploy `REFERRAL_ORACLE`; runtime `REFERRAL_ORACLE_ROOT_ADDRESS` (defaults to `ORACLE_ADDRESS`); optional `REFERRAL_ORACLE_PRIVATE_KEY` | Prefer **same EOA as contest oracle** |

`VITE_ORACLE_ADDRESS` must match `ORACLE_PRIVATE_KEY`, on-chain contest `oracle`, and (unless split) referral oracle / root.

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
                      └─ referralNetworkBps → RewardDistributor
                                              ├─ user referrers
                                              └─ oracle ancestor ──paymentToken──► Cron-Ops wallet
```

Contest escrow itself is **not** Cron-Ops balance — users move payment token in/out of controllers. Cron-Ops only needs **ETH float** for gas and will **accrue paymentToken** from referral ancestor fees over time (platform income core; see [economics-sketch.md](../internal/economics-sketch.md) and [referral-network.md](../platform/referral-network.md)).

### Ops funding

| Need | Practice |
|------|----------|
| ETH | Keep warm enough for a busy settle week + referral sync batch; top up when low |
| Payment token | No pre-fund required; optionally sweep accrued fees to cold / operating accounts on a schedule |

Env: `server/.env` / cron / swarm → `ORACLE_*`, optional `REFERRAL_ORACLE_*`, RPC; client → `VITE_ORACLE_ADDRESS`, `VITE_REFERRAL_GROUP_ID`.

**Open:** Confirm mainnet contest oracle address; confirm referral oracle ≡ contest oracle.

---

## 3. Marketing_test — Side-bet in / out

**Shape:** A **paymentToken ledger** only — no meaningful ETH role beyond optional outbound-tx gas if ops sends payouts from `out`. Separate from contest escrow and Cron-Ops keys.

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

| Bucket | Role | Base Sepolia | Base mainnet |
|--------|------|--------------|--------------|
| Infra | Deployer | | |
| Cron-Ops | Contest oracle | | |
| Cron-Ops | Referral oracle / root | | |
| Marketing_test | Side-bet in | | `0x6569E9BA175fA46FFf13bc649E0D92813E507a06` |
| Marketing_test | Side-bet out | | |

Never commit private keys. Addresses only in this doc; keys only in sealed env / secrets managers.
