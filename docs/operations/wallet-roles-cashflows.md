# Wallet roles and ops cashflows

Operational inventory of **platform wallets / keys** on Base — organized by ops bucket. Use this to coordinate funding and key custody.

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

---

## 1. Infra — Deployer (`DEPLOYER_PK`)

**Shape:** One-time (or rare) deploy expense. Fund with **ETH**, run `Deploy_base.s.sol` (or Sepolia), then treat as a **cold wallet** unless you leave it as long-lived contract owner (see below). No ongoing prize custody.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Deployer** | Broadcasts forge scripts; inherits contract ownership | Yes — `contracts/.env` `DEPLOYER_PK` | Deploy time only | `0x853C54FB2e9d674A9a158B7F6e8F323d023f03c8` |

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

**Practical fund:** put **0.02 ETH** on the deployer EOA for a Base deploy (covers deploy + a couple retries + `transferOwnership` txs). Sepolia is cheap/test ETH. Re-estimate with `forge script … --estimate` — fees move with L1.

### Roles the deployer inherits

From `Deploy_base.s.sol` as written today (`initialOwner = deployer`; the ReferralGraph oracle is the **`OPERATOR_PK` address**, falling back to the deployer only if `OPERATOR_PK` is unset):

| Cap / role | Contract | Deployer gets it? | What it can do | Keep on deployer? |
|------------|----------|-------------------|----------------|-------------------|
| **`owner`** | `ReferralGraph` | **Yes** (constructor `initialOwner`) | `authorizeOracle` / `unauthorizeOracle`, `transferOwnership` | Maybe — admin capability; often move to a multi-sig / cold Ops admin |
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

- [x] Document deployer address for the Base mainnet deploy.
- [ ] Decide **owner disposition** after deploy: keep cold / multi-sig / renounce.
- [x] Set `OPERATOR_PK` at deploy so its address (not the deployer) is the authorized referral oracle on mainnet.

---

## 2. Cron-Ops — operator (`OPERATOR_PK`)

**Shape:** One hot key on web + cron hosts ([cron-pi.md](cron-pi.md)) for contest operator lifecycle and referral registration. Compromising it = full contest and referral registration control. It is **not** the referral tree root.

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Operator** | On-chain: factory / contest `operator` (activate / lock / settle / cancel / push). Separately: ReferralGraph authorized `oracle` for `REFERRAL_GROUP_ID` (`register` / `batchRegister` / skiplist) | Yes — server + cron | `OPERATOR_PK` (address derived, or pin `OPERATOR_ADDRESS`); client `VITE_OPERATOR_ADDRESS` | `0x3f76535570b1Bb18D454bC7A8B76f2dEE1726AA5` |

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

**Open:** Keep operator ETH float warm for settle / register / push.

---

## 3. Referral platform root (`referralPlatformRootAddress`)

**Shape:** Cold address-only — multisig or hardware wallet held outside web and cron. Registered under `REFERRAL_ROOT` as the organic referral-tree parent at **contract deploy**. Not embedded in contests (factory immutables supply operator / referral stack).

| Role | Purpose | Holds keys? | Env / config | Known address |
|------|---------|-------------|--------------|---------------|
| **Referral platform root** | Organic parent under `REFERRAL_ROOT`; receives its referral-network fee share | **No** in app env — ops custody only | `REFERRAL_PLATFORM_ROOT_ADDRESS` in `contracts/.env` at deploy; persisted as `referralPlatformRootAddress` in client/server chain JSON | `0x15c3DC71f1f7Fd975e6c82Ff84e8bcaC0E4b2acb` |

### Balance model

| Asset | Direction | Why |
|-------|-----------|-----|
| **ETH** | None required for app flows | Not a contest signer |
| **Payment token** | In (ongoing) | Referral-network fee share when on the winner's payout chain |

```text
settleContest → ReferralNetworkFeeDistributed → cold platform root (when ancestor)
```

---

## Address register

| Bucket | Role | Env key | Base Sepolia | Base mainnet |
|--------|------|---------|--------------|--------------|
| Infra | Deployer | `DEPLOYER_PK` | | `0x853C54FB2e9d674A9a158B7F6e8F323d023f03c8` |
| Cron-Ops | Operator (contest lifecycle + referral signer) | `OPERATOR_PK` | | `0x3f76535570b1Bb18D454bC7A8B76f2dEE1726AA5` |
| Referral | Platform root (organic referral parent) | `referralPlatformRootAddress` (chain JSON) | `0x15c3DC71f1f7Fd975e6c82Ff84e8bcaC0E4b2acb` | `0x15c3DC71f1f7Fd975e6c82Ff84e8bcaC0E4b2acb` |

Never commit private keys. Addresses only in this doc; keys only in sealed env / secrets managers.

---

## Player funding

Production players hold **canonical Base USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) in their Privy smart wallet. They add it by transferring USDC on Base from an exchange or another wallet. Coinbase and Robinhood are the paths named in the product. Staging is **MockUSDC (xUSDC)** on Base Sepolia, funded player-to-player. The client does not open a card checkout.

### Card onramp

Privy Dashboard → Funding has card onramps enabled for Stripe and MoonPay. The client does not call `useDepositFunds`. The hook lives in `@privy-io/react-auth` (client is on `^3.51.4`; Stripe's embedded checkout needs `3.33.1` or later) and needs a direct `@stripe/crypto` dependency before Stripe can mount. A future call funds the **smart-wallet address** on chain `base`, asset `usdc`. Card onramps deliver mainnet assets. Stripe rejects testnets, including when `fiat.environment` is `sandbox`.

Checked against Privy's deposit docs on 15 Nov 2026:

| Dashboard setup | Provider | Fiat the client can quote | Coverage |
|-----------------|----------|----------------------------|----------|
| Card onramps on, Meld not configured | Stripe | USD, EUR | Debit, credit, Apple Pay, Google Pay, and ACH (US only). Embedded Components: United States except New York, and the EU. USDC on Base is a supported destination. |
| Same | MoonPay | AUD, BRL | Card and local methods for those two currencies. This route does not quote USD. |
| Meld → Configure, KYB approved | Meld's network | 50+ ISO currencies | Card, bank transfer, and local methods in 100+ countries. USD through a non-Stripe provider depends on this approval. |

`fiat.preferredProvider` (`stripe`, `moonpay`, `coinbase`, `meld`) only picks among quotes Privy already returned. A provider with no quote is skipped.

### New York

A New York session on the enabled Stripe route returns **Stripe onramp is not available in New York** and leaves Continue disabled. No second provider quotes USD, so the modal cannot complete.

Stripe documents the same limit for Embedded Components: available in the US and the EU, **not in New York**. Stripe is merchant of record for that onramp and runs KYC, sanctions screening, and disputes.

New York treats a fiat-to-crypto exchange as virtual currency business activity. Under [23 NYCRR 200.2(q)](https://www.dfs.ny.gov/apps_and_licensing/virtual_currency_businesses) and 200.3(a), activity involving New York or a New York resident needs a BitLicense, or a New York Banking Law charter approved for that activity, before it can be offered. Moving the dollars can also require a New York money transmitter license under Banking Law Article 13-B. Play The Cut holds neither license. The onramp company is the licensed party.

[MoonPay USA LLC](https://www.moonpay.com/legal/licenses) holds a New York virtual-currency license and a New York money transmitter license (NYDFS license 0000045; BitLicense announced [4 Jun 2025](https://www.moonpay.com/newsroom/ny-bitlicense)). MoonPay states that those licenses let it serve all 50 states. Privy's default client integration still sends only AUD and BRL to MoonPay until Meld KYB is approved, so that license does not produce a USD quote in the current dashboard setup.

### Ship when

Meld production access is approved, and a New York session receives a USD quote that delivers canonical Base USDC to the smart wallet. Until that quote exists, Wallet stays receive and send.

Sources: [Privy deposit modal](https://docs.privy.io/wallets/funding/use-deposit-funds), [Privy deposit configuration](https://docs.privy.io/financial-flows/deposits/configuration), [Stripe Embedded Components onramp](https://docs.stripe.com/crypto/onramp/embedded-components-overview), [NYDFS virtual currency licensing](https://www.dfs.ny.gov/apps_and_licensing/virtual_currency_businesses).
