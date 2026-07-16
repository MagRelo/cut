# Base mainnet cutover (Sunday)

Operational checklist to merge `newSettle`, validate on Sepolia, then deploy the new contest + referral stack on Base (`8453`). Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

**Do not start Base cutover until both live contests (Fri + Sun) are SETTLED on the old contract stack**, with cron still on pre-`newSettle` code.

Related:

- [docs/operations/wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md)
- [docs/platform/referral-network.md](docs/platform/referral-network.md) (post-`newSettle` shape: `ReferralGraph` + `RewardCalculator`)
- [scripts/README.md](scripts/README.md) · [contracts/env.example](contracts/env.example)
- Swarm web vs cron: [swarm/README.md](swarm/README.md)

```text
Pre-Sunday          Sunday AM              Sunday PM
─────────           ──────────             ─────────
Settle Fri/Sun  →   Merge newSettle    →   Deploy Base
Keep old cron       Sepolia redeploy       Rebuild referral
                    Full settle test       Seed USDC + env/PK
                    Deploy web+cron        Smoke create/enter
```

---



## 0. Preconditions (before Sunday)

- [ ] Fri contest settled + payouts OK on **old** ABI
- [ ] Sun contest settled + payouts OK on **old** ABI
- [ ] Cron host still running **pre-**`newSettle` until section 5
- [x] Prod DB already has popularity migration (`20260715200000_contest_popularity_scoring`) — done
- [x] `main` pushed / web deploy of popularity (`adjust`) is optional and independent of this cutover
- [ ] Decide / document addresses:


| Role                        | Address | Notes                                                        |
| --------------------------- | ------- | ------------------------------------------------------------ |
| Deployer (cold)             | TBD     | `contracts/.env` `PRIVATE_KEY` for forge                     |
| Contest oracle / Cron-Ops   | TBD     | Same EOA preferred for referral oracle                       |
| Referral oracle             | TBD     | Set `REFERRAL_ORACLE` at deploy = Cron-Ops; **not** deployer |
| Ops admin / ownership       | TBD     | Keep cold, multi-sig, or renounce after deploy               |
| USDC treasury (seed source) | TBD     | Real USDC on Base to fund test wallets                       |


- [ ] Fund deployer with **~0.02 ETH** on Base (deploy + retries + ownership txs)
- [ ] Fund Cron-Ops with enough **ETH** for settle / register / push week
- [ ] Confirm `REFERRAL_GROUP_ID` (bytes32) — same value in `contracts/.env`, `server/.env`, `web.env`, cron env, and client `VITE_REFERRAL_GROUP_ID`
- [ ] Confirm Base USDC address and that app `base.json` will use it as `paymentTokenAddress`

---



## 1. Merge `newSettle` into `main`

ABI / settlement path change: old `settleContest(entries, bps, referralReward, signature)` → new `settleContest(entries, bps)` with on-chain fee split via `ReferralGraph` + `RewardCalculator` (no `RewardDistributor`, no settlement referral signature).

- [ ] Rebase or merge latest `main` into `newSettle` if needed; resolve conflicts (`docs/platform/architecture.md`, `server/src/routes/contest.ts`)
- [ ] Merge `newSettle` → `main`
- [ ] Smoke locally: client build, server build, unit tests for settle / secondary pricing
- [ ] Push `main` (do **not** deploy web+cron to prod until Sepolia test passes — section 2–3)

---



## 2. Sepolia: redeploy referral + factory and test

Goal: prove the **new** settle / close / claim path end-to-end before touching Base.

### 2a. Deploy contracts (Sepolia)

```bash
# contracts/.env: PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, REFERRAL_GROUP_ID, REFERRAL_ORACLE=<cron-ops>
pnpm run sepolia:deploy-referral
pnpm run sepolia:deploy-contest-factory
# or full: pnpm run deploy:contracts:sepolia
```

- [ ] Patch both `client/src/utils/contracts/sepolia.json` and `server/src/contracts/sepolia.json`:
  - `contestFactoryAddress`
  - `referralGraphAddress`
  - `rewardCalculatorAddress` (not `rewardDistributorAddress`)
  - leave `paymentTokenAddress` = existing MockUSDC unless full redeploy
- [ ] `pnpm run deploy:copy-artifacts`
- [ ] Verify on Blockscout if desired (`pnpm run verify:contracts:sepolia`)



### 2b. Rebuild referral graph (Sepolia)

```bash
# server/.env: REFERRAL_GROUP_ID, ORACLE_*, REFERRAL_ORACLE_ROOT_ADDRESS, REFERRAL_SYNC_CHAIN_ID=84532
pnpm --filter server run script:bootstrap-referral-oracle-root
pnpm --filter server run script:register-users-under-oracle-root -- --dry-run
pnpm --filter server run script:register-users-under-oracle-root
pnpm --filter server run service:batch-sync-referral-graph   # until deferred: 0
```

- [ ] Oracle registered under `REFERRAL_ROOT`
- [ ] Organic users under oracle
- [ ] Invite chains synced (`deferred: 0`)



### 2c. Sepolia acceptance test

- [ ] Create contest via app (new factory args: `referralGraph` + `rewardCalculator`)
- [ ] Enter lineup / primary deposit (mint xUSDC via `scripts/sepolia/mintPaymentToken.js` if needed)
- [ ] Optional: secondary buy after activate
- [ ] Lock → settle (cron or admin) — **2-arg** `settleContest`
- [ ] Confirm referral fee transfers + `OnchainPayment` `REFERRAL` rows
- [ ] Claim / push primary + secondary
- [ ] Close after expiry (incl. CANCELLED path if you care)
- [ ] Deploy **staging** web + a test cron against Sepolia with `newSettle` builds (or local) before Base

---



## 3. Base: deploy scripts

`Deploy_base.s.sol` deploys (same shape as Sepolia, minus MockUSDC):

| Contract | Notes |
|----------|--------|
| `ContestFactory` | New contests only |
| `ReferralGraph` | `initialOwner` = deployer; oracle auth for `REFERRAL_GROUP_ID` |
| `RewardCalculator` | Stateless |

Payment token is **not** deployed — canonical Base USDC is recorded into config by `scripts/deploy.js`. No PlatformToken / DepositManager / Aave yield stack.

```bash
# contracts/.env: PRIVATE_KEY, BASE_RPC_URL, REFERRAL_GROUP_ID, REFERRAL_ORACLE=<cron-ops address>
pnpm run deploy:contracts:base
```

- [ ] Confirm forge broadcast succeeded; capture addresses from logs
- [ ] Confirm `client/src/utils/contracts/base.json` + `server/src/contracts/base.json` updated with:
  - `paymentTokenAddress` = Base USDC
  - `contestFactoryAddress`
  - `referralGraphAddress`
  - `rewardCalculatorAddress`
- [ ] `pnpm run deploy:copy-artifacts`
- [ ] Verify on Basescan / Blockscout (`pnpm run verify:contracts:base`)
- [ ] **Owner disposition:** transfer `ReferralGraph` ownership off hot deployer if planned (multi-sig / cold admin)

**Important:** Existing contests on the previous factory remain on the **old** ABI. Only **new** contests use this factory. Do not point settle cron at old contests with new code (those should already be settled).

---



## 4. Rebuild referral graph on Base

Same bootstrap as Sepolia, but `REFERRAL_SYNC_CHAIN_ID=8453` (and Base RPC / oracle key).

```bash
pnpm --filter server run script:bootstrap-referral-oracle-root
pnpm --filter server run script:register-users-under-oracle-root -- --dry-run
pnpm --filter server run script:register-users-under-oracle-root
pnpm --filter server run service:batch-sync-referral-graph   # until deferred: 0
```

- [ ] On-chain: oracle → `REFERRAL_ROOT`
- [ ] Register production wallets that will enter the first Base contest
- [ ] Cron job 7 (`batchSyncReferralGraph`) healthy on the **new** cron build

---



## 5. Roles, keys, and env cutover

Cut over **web and cron together** once Base contracts + Sepolia test are good.

### 5a. Addresses / PKs checklist

- [ ] `ORACLE_ADDRESS` / `ORACLE_PRIVATE_KEY` on web + cron = contest oracle
- [ ] Client `VITE_ORACLE_ADDRESS` matches
- [ ] `REFERRAL_ORACLE` used at deploy = that same address (or documented split key)
- [ ] `REFERRAL_ORACLE_ROOT_ADDRESS` set (defaults to oracle)
- [ ] `REFERRAL_GROUP_ID` identical everywhere
- [ ] RPC: `BASE_RPC_URL` on server/cron; client wallet chain = Base `8453`
- [ ] No leftover `rewardDistributorAddress` required in runtime config
- [ ] Remove / stop using settlement referral signing path (`buildSettlementReferralArgs` gone on `newSettle`)



### 5b. Deploy app

- [ ] Push `main` with contract JSON + ABIs committed
- [ ] Build/release image (`pnpm run deploy` / your release pipeline)
- [ ] Swarm: roll **web** (`ENABLE_CRON=false`)
- [ ] Cron host: pull same build, `ENABLE_CRON=true`, restart `cron-app`
- [ ] `GET /api/cron/status` OK

---



## 6. Seed user balances on Base (real USDC)

Cannot mint USDC on mainnet. Fund from treasury → user Privy / smart wallets.

- [ ] Freeze recipient list (wallet addresses on Base) + amounts
- [ ] Confirm each wallet is the chain address the app uses for contests
- [ ] Transfer USDC from treasury (manual cast/UI or a one-off funded script — **not** MockUSDC mint)
- [ ] Spot-check balances in app / Basescan
- [ ] Optional: small ETH for any EOA that must self-pay gas (Privy sponsored gas may cover users)

Suggested starter table:


| User / wallet | USDC amount | Tx hash | Done |
| ------------- | ----------- | ------- | ---- |
|               |             |         | [ ]  |
|               |             |         | [ ]  |


---



## 7. Production smoke (Base)

- [ ] Create a **small** live contest on the new factory
- [ ] Enter with a seeded wallet; confirm escrow holds USDC
- [ ] Activate → (optional secondary) → lock → settle via cron
- [ ] Referral fee distribution looks correct
- [ ] Claim / push payouts
- [ ] No calls attempted against old contest addresses with new settle ABI

---



## 8. Rollback / holds


| If this fails…                             | Hold / do this                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Sepolia settle broken                      | Do **not** merge-deploy to prod cron; fix on `newSettle` first                      |
| Base deploy txs fail                       | Keep old web/cron; retry deploy with more ETH / quieter L1                          |
| Referral sync stuck `deferred > 0`         | Fix missing parent wallets before first settle with `referralNetworkBps > 0`        |
| Need to settle an **old** leftover contest | Temporarily run **old** settle tooling / do not use new ABI against old controllers |


---



## Quick command index


| Step                       | Command                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| Merge                      | `git checkout main && git merge newSettle`                                     |
| Sepolia referral + factory | `pnpm run sepolia:deploy-referral` · `pnpm run sepolia:deploy-contest-factory` |
| Full Sepolia / Base deploy | `pnpm run deploy:contracts:sepolia` · `pnpm run deploy:contracts:base`         |
| Copy ABIs                  | `pnpm run deploy:copy-artifacts`                                               |
| Bootstrap oracle root      | `pnpm --filter server run script:bootstrap-referral-oracle-root`               |
| Register organics          | `pnpm --filter server run script:register-users-under-oracle-root`             |
| Sync invites               | `pnpm --filter server run service:batch-sync-referral-graph`                   |
| Sepolia mint xUSDC         | `node scripts/sepolia/mintPaymentToken.js` (testnet only)                      |


---



## Open decisions (fill before Sunday)

- [ ] Final oracle address (and whether referral oracle is the same key)
- [ ] Deployer ownership: keep / transfer / renounce
- [ ] USDC seed amounts and recipient list
- [ ] First post-cutover contest (sport / entry fee / soft cap)