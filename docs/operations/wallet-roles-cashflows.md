# Wallet roles and ops cashflows

Operational inventory of **platform wallets / keys** on Base — organized by ops bucket. Use this to coordinate funding, key custody, and mainnet cutover.

Related: [referral-network.md](../platform/referral-network.md) · [economics-sketch.md](../internal/economics-sketch.md) · [cron-pi.md](cron-pi.md) · [contracts/env.example](../../contracts/env.example) · [client/.env.example](../../client/.env.example) · [server/.env.example](../../server/.env.example)

**Chain:** Base mainnet `8453` for production; Base Sepolia `84532` for staging. Contest prize money stays in **ContestController** escrow — winners claim (or operator push-payout) from the contract. Payment token is **canonical Base USDC** on mainnet and **MockUSDC (xUSDC)** on Sepolia.

**User wallets** (Privy smart wallets) are not platform roles; they are listed only where cashflows touch them. User gas sponsorship (e.g. paymaster) is a **USD opex** line — not a wallet role here.

Platform signing keys and the cold referral platform root. Contest role is **`operator`**. ReferralGraph registrar is **authorized `oracle`**. One hot EOA (`OPERATOR_PK` / `VITE_OPERATOR_ADDRESS`) fills both.

```text
DEPLOYER_PK                       Infra / Deployer — ReferralGraph.owner; one-time ETH spend; then cold
OPERATOR_PK                       Hot EOA — ContestFactory.operator + ReferralGraph authorized oracle; leaks ETH
REFERRAL_PLATFORM_ROOT_ADDRESS    Cold address-only — organic referral-tree parent; receives referral share
                                  (no private key in web, cron, or server env; not a contest role)
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

Env: `contracts/.env` → `DEPLOYER_PK`, `OPERATOR_PK` (its address becomes the ReferralGraph oracle), `REFERRAL_PLATFORM_ROOT_ADDRESS` (must differ from operator), `REFERRAL_GROUP_ID`, RPC.

### Deploy cost estimate (Base mainnet)

`Deploy_base` creates **three** contracts in one broadcast: ContestFactory, ReferralGraph, RewardCalculator. Creation bytecode is large (ContestFactory alone ~20 KB) — most of the fee is **L1 data**, which tracks Ethereum congestion.

| Scenario | Rough ETH | Rough USD (at ~$2–3k ETH) |
|----------|-----------|---------------------------|
| Quiet L1 / happy path | **~0.001–0.005 ETH** | **~$2–15** |
| Busy L1 or retries | **~0.005–0.02 ETH** | **~$15–50** |

**Practical fund:** put **0.02 ETH** on the deployer EOA for mainnet cutover (covers deploy + a couple retries + `transferOwnership` txs). Sepolia is cheap/test ETH. Re-estimate before go-live with `forge script … --estimate` — fees move with L1.

### Roles the deployer inherits

From `Deploy_base.s.sol` as written today (`initialOwner = deployer`; the ReferralGraph oracle is the **`OPERATOR_PK` address**, falling back to the deployer only if `OPERATOR_PK` is unset):

| Cap / role | Contract | Deployer gets it? | What it can do | Keep on deployer? |
|------------|----------|-------------------|----------------|-------------------|
| **`owner`** | `ReferralGraph` | **Yes** (constructor `initialOwner`) | `authorizeOracle` / `unauthorizeOracle`, `transferOwnership` | Maybe — admin capability; often move to a multi-sig / cold Ops admin after cutover |
| **Authorized referral oracle** (`REFERRAL_GROUP_ID`) | `ReferralGraph` | **No** if `OPERATOR_PK` is set (its address is authed instead) | `register` / `batchRegister` / skiplist (oracle paths) | **No** — this belongs to the operator, not the cold deployer |
| **ContestFactory operator** | `ContestFactory` | **No** if `OPERATOR_PK` is set | Lifecycle / settle / push on every contest from that factory | Factory immutable → **operator** (`VITE_OPERATOR_ADDRESS`) |
| **ContestFactory owner** | `ContestFactory` | **No** | Factory is not Ownable; anyone can `createContest` (4 uint args) | N/A |
| **MockUSDC owner** (Sepolia only) | `MockUSDC` | **Yes** on `Deploy_sepolia` | `mint` / `burn` | Sepolia faucet-style; not a mainnet role |

**Implication:** Deployer **will** be Ownable admin of `ReferralGraph` unless you transfer afterward. As long as `OPERATOR_PK` is set at deploy, the deployer is **not** the referral oracle or contest operator.

Post-deploy options:

1. **Cold deployer keeps ownership** — rare ops; deploy key must stay safe forever for `authorizeOracle` / rescue.
2. **`transferOwnership` → multi-sig / Ops admin** — recommended if ownership stays in play.
3. **Renounce ownership** — only if you are sure you will never need to rotate the operator authorization.

### Open

- [ ] Document deployer address for the Base mainnet deploy.
- [ ] Decide **owner disposition** after deploy: keep cold / multi-sig / renounce.
- [ ] Set `OPERATOR_PK` at deploy so its address (not the deployer) is the authorized referral oracle on mainnet.

---

## 2. Cron-Ops — operator (`OPERATOR_PK`)

**Shape:** One hot key on web + cron hosts ([cron-pi.md](cron-pi.md)) for contest operator lifecycle and referral registration. Compromising it = full contest and referral registration control. It is **not** the referral tree root.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Operator** | On-chain: factory / contest `operator` (activate / lock / settle / cancel / push). Separately: ReferralGraph authorized `oracle` for `REFERRAL_GROUP_ID` (`register` / `batchRegister` / skiplist) | Yes — server + cron | `OPERATOR_PK` (address derived, or pin `OPERATOR_ADDRESS`); client `VITE_OPERATOR_ADDRESS` | TBD |

That address must match `OPERATOR_PK`, `ContestFactory.operator()`, ReferralGraph `isAuthorizedOracle` for `REFERRAL_GROUP_ID`, and client `VITE_OPERATOR_ADDRESS`. It must **differ** from the referral platform root. Referral-network fees settle to the platform root; the operator is a hot signing key and must not receive those funds. Contract deploys revert if the addresses match.

### Balance model

| Asset | Direction | Why |
|-------|-----------|-----|
| **ETH** | **Leaks** (ongoing out) | Gas for contest lifecycle txs and referral `register` / `batchRegister` |
| **Payment token** | None expected | Push-batch dust is credited into winner pools (`UnallocatedBalanceAllocated`), never transferred to the operator |

Referral-network fee shares go to referrers in the payout chain, including the cold platform root when it appears as an ancestor. The hot operator is **not** an ancestor in the current tree model.

```text
                    ETH ──spend──► settle / register / push txs
User ──deposit──► ContestController
                      │
                      ├─ settleContest → prizes (claim/push to users)
                      └─ referralNetworkBps → RewardCalculator split
                                              └─ referrers + cold platform root
                                                      (ReferralNetworkFeeDistributed)

After push batches: UnallocatedBalanceAllocated → winner pools (not operator)
```

Contest escrow itself is **not** operator balance — users move payment token in/out of controllers. The operator only needs **ETH float** for gas.

### Ops funding

| Need | Practice |
|------|----------|
| ETH | Keep warm enough for a busy settle week + referral sync batch; top up when low |
| Payment token | No pre-fund required |

Env: `server/.env` / cron / swarm → `OPERATOR_PK` (optional `OPERATOR_ADDRESS`), RPC; client → `VITE_OPERATOR_ADDRESS`, `VITE_REFERRAL_GROUP_ID`.

**Open:** Confirm mainnet operator address; fund with Base ETH before cutover.

---

## 3. Referral platform root (`referralPlatformRootAddress`)

**Shape:** Cold address-only — multisig or hardware wallet held outside web and cron. Registered under `REFERRAL_ROOT` as the organic referral-tree parent at **contract deploy**. Not embedded in contests (factory immutables supply operator / referral stack).

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Referral platform root** | Organic parent under `REFERRAL_ROOT`; receives its referral-network fee share | **No** in app env — ops custody only | `REFERRAL_PLATFORM_ROOT_ADDRESS` in `contracts/.env` at deploy; persisted as `referralPlatformRootAddress` in client/server chain JSON | TBD |

### Balance model

| Asset | Direction | Why |
|-------|-----------|-----|
| **ETH** | None required for app flows | Not a contest signer |
| **Payment token** | In (ongoing) | Referral-network fee share when on the winner's payout chain |

```text
settleContest → ReferralNetworkFeeDistributed → cold platform root (when ancestor)
```

---

## 4. Marketing_test — Side-bet in / out

**Shape:** A **paymentToken ledger** only — no meaningful ETH role beyond optional outbound-tx gas if ops sends payouts from `out`. Separate from contest escrow and the operator key.

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
| Cron-Ops | Operator (contest lifecycle + referral signer) | `OPERATOR_PK` | | |
| Referral | Platform root (organic referral parent) | `referralPlatformRootAddress` (chain JSON) | | |
| Marketing_test | Side-bet in | `VITE_SIDE_BET_STAKE_RECIPIENT` | | `0x6569E9BA175fA46FFf13bc649E0D92813E507a06` |
| Marketing_test | Side-bet out | — | | |

Never commit private keys. Addresses only in this doc; keys only in sealed env / secrets managers.
