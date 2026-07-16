# Base mainnet cutover (Sunday)

Validate `newSettle` on **Sepolia**, then on **Base**, lock the client to **Base only**, and only then merge into `main` and deploy web + cron.

Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

**Section 1 (Sepolia) starts now** — it is testnet-only and touches nothing in prod, so the live Fri/Sun contests are unaffected. **Do not merge or deploy to prod until sections 1–3 are green**; keep prod web + cron on pre-`newSettle` until section 4. The only hard gate against the live contests is the **Base** on-chain rollout (section 2), which waits until Fri + Sun are SETTLED on the old contract stack.

Related:

- [docs/operations/wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md)
- [docs/platform/referral-network.md](docs/platform/referral-network.md) (post-`newSettle` shape: `ReferralGraph` + `RewardCalculator`)
- [scripts/README.md](scripts/README.md) · [contracts/env.example](contracts/env.example)
- Swarm web vs cron: [swarm/README.md](swarm/README.md)

```text
On newSettle branch              Then                         Last
────────────────────             ────                         ────
1. Fresh Sepolia rollout    →    2. Base rollout         →    3. Client = Base only
   roles + full settle test         roles + smoke                4. Merge → deploy web+cron
```

ABI change (for reference): old `settleContest(entries, bps, referralReward, signature)` → new `settleContest(entries, bps)` via `ReferralGraph` + `RewardCalculator` (no `RewardDistributor`, no settlement referral signature).

---

## 0. Preconditions

**Starting now:** section 1 (Sepolia) is safe to begin immediately — testnet only, no prod / contract / DB changes, so live contests are untouched. The items below gate only the **Base** work (section 2+), not the Sepolia rollout.

- [x] Section 1 (Sepolia) can start now — nothing here affects the live contests
- [ ] Work happens on **`newSettle`** until merge (section 4); prod stays on old settle path
- [x] Prod DB popularity migration (`20260715200000_contest_popularity_scoring`) — done
- [ ] **Gate for Base only:** Fri contest settled + payouts OK on **old** ABI
- [ ] **Gate for Base only:** Sun contest settled + payouts OK on **old** ABI
- [ ] Decide / document addresses (needed before Sepolia deploy in section 1a):

| Role | Env key | Address | Notes |
|------|---------|---------|-------|
| Deployer (cold) | `DEPLOYER_PK` | TBD | `contracts/.env`, for forge broadcast |
| OPS_ORACLE (contest + referral) | `OPS_ORACLE_PK` | TBD | One EOA; its address is authed as ReferralGraph oracle at deploy. **Not** the deployer |
| Ops admin / ownership | — | TBD | Keep cold, multi-sig, or renounce after Base deploy |
| USDC treasury (seed source) | — | TBD | Real USDC on Base to fund test wallets |

- [ ] Fund deployer (`DEPLOYER_PK`) with Sepolia ETH (section 1) and **~0.02 ETH** on Base (section 2)
- [ ] Fund OPS_ORACLE (`OPS_ORACLE_PK`) with enough **ETH** on Base for settle / register / push
- [ ] Confirm `REFERRAL_GROUP_ID` (bytes32) — same value for Sepolia + Base deploys and later in `server` / `web.env` / cron / `VITE_REFERRAL_GROUP_ID`

---

## 1. Fresh Sepolia rollout (`newSettle`)

Goal: prove contracts, roles, referral bootstrap, and full settle/claim path on testnet **before** touching Base.

Stay checked out on `newSettle`. Use local (or staging) app pointed at Sepolia — **not** prod.

### 1a. Deploy contracts

```bash
# contracts/.env: DEPLOYER_PK, OPS_ORACLE_PK, BASE_SEPOLIA_RPC_URL, REFERRAL_GROUP_ID
pnpm run deploy:contracts:sepolia
# or partial: pnpm run sepolia:deploy-referral && pnpm run sepolia:deploy-contest-factory
```

- [ ] Fresh `ContestFactory` + `ReferralGraph` + `RewardCalculator` (+ MockUSDC if full redeploy)
- [ ] `client` + `server` `sepolia.json` updated:
  - `contestFactoryAddress`
  - `referralGraphAddress`
  - `rewardCalculatorAddress` (not `rewardDistributorAddress`)
  - `paymentTokenAddress` = MockUSDC
- [ ] `pnpm run deploy:copy-artifacts`
- [ ] Verify on Blockscout if desired (`pnpm run verify:contracts:sepolia`)

### 1b. Roles on Sepolia

- [ ] `OPS_ORACLE_PK` set at deploy so its address (not the cold deployer) is authed as the ReferralGraph oracle
- [ ] `ReferralGraph` owner = deployer (or transferred per plan)
- [ ] Server/local: `OPS_ORACLE_PK` matches the on-chain contest + referral oracle
- [ ] `REFERRAL_GROUP_ID` matches on-chain auth
- [ ] `REFERRAL_SYNC_CHAIN_ID=84532`

### 1c. Rebuild referral graph

```bash
pnpm --filter server run script:bootstrap-referral-oracle-root
pnpm --filter server run script:register-users-under-oracle-root -- --dry-run
pnpm --filter server run script:register-users-under-oracle-root
pnpm --filter server run service:batch-sync-referral-graph   # until deferred: 0
```

- [ ] Oracle registered under `REFERRAL_ROOT`
- [ ] Organic users under oracle
- [ ] Invite chains synced (`deferred: 0`)

### 1d. Sepolia acceptance test

- [ ] Create contest (factory args: `referralGraph` + `rewardCalculator`)
- [ ] Enter lineup / primary deposit (mint via `pnpm run mint-tokens` if needed)
- [ ] Optional: secondary buy after activate
- [ ] Lock → settle — **2-arg** `settleContest`
- [ ] Referral fee transfers + `OnchainPayment` `REFERRAL` rows
- [ ] Claim / push primary + secondary
- [ ] Close after expiry (incl. CANCELLED if you care)
- [ ] **Gate:** do not start Base until this section is green

---

## 2. Base rollout (`newSettle`)

Same stack as Sepolia, minus MockUSDC. Still on the **`newSettle` branch** — do not merge yet.

`Deploy_base.s.sol` deploys:

| Contract | Notes |
|----------|--------|
| `ContestFactory` | New contests only |
| `ReferralGraph` | `initialOwner` = deployer; oracle auth for `REFERRAL_GROUP_ID` |
| `RewardCalculator` | Stateless |

Payment token is **not** deployed — canonical Base USDC is written into config by `scripts/deploy.js`.

### 2a. Deploy contracts

```bash
# contracts/.env: DEPLOYER_PK, OPS_ORACLE_PK, BASE_RPC_URL, REFERRAL_GROUP_ID
pnpm run deploy:contracts:base
```

- [ ] Forge broadcast OK; capture addresses
- [ ] `client` + `server` `base.json` updated with:
  - `paymentTokenAddress` = Base USDC
  - `contestFactoryAddress`
  - `referralGraphAddress`
  - `rewardCalculatorAddress`
- [ ] `pnpm run deploy:copy-artifacts`
- [ ] Verify (`pnpm run verify:contracts:base`)
- [ ] Owner disposition for `ReferralGraph` (keep cold / transfer / renounce)

**Important:** Old Base contests stay on the previous factory/ABI. Only **new** contests use this factory. Prod cron must remain on old code until section 4.

### 2b. Roles on Base

- [ ] Same OPS_ORACLE / `REFERRAL_GROUP_ID` story as Sepolia (section 1b), now for chain `8453`
- [ ] `REFERRAL_SYNC_CHAIN_ID=8453` for bootstrap scripts
- [ ] OPS_ORACLE funded with Base ETH

### 2c. Rebuild referral graph on Base

```bash
pnpm --filter server run script:bootstrap-referral-oracle-root
pnpm --filter server run script:register-users-under-oracle-root -- --dry-run
pnpm --filter server run script:register-users-under-oracle-root
pnpm --filter server run service:batch-sync-referral-graph   # until deferred: 0
```

- [ ] Oracle → `REFERRAL_ROOT`
- [ ] Register wallets that will enter the first Base contest
- [ ] Sync until `deferred: 0`

### 2d. Seed USDC + Base smoke (pre-merge)

Cannot mint USDC on mainnet. Fund from treasury → Privy / smart wallets.

| User / wallet | USDC amount | Tx hash | Done |
|---------------|-------------|---------|------|
| | | | [ ] |
| | | | [ ] |

- [ ] Freeze recipient list + amounts; wallets match app chain addresses
- [ ] Transfer USDC; spot-check Basescan / local app
- [ ] Create a **small** contest on the new factory (local/`newSettle` against Base)
- [ ] Enter → activate → lock → settle → referral fees → claim/push
- [ ] **Gate:** do not change client or merge until this smoke is green

---

## 3. Client exclusively Base network

Still on `newSettle` (or a short-lived branch off it). Remove Sepolia as a user-facing / default chain so production wallets only talk to Base `8453`.

- [ ] Wallet / wagmi / Privy: Base mainnet only (drop Sepolia from supported chains in prod build)
- [ ] Env: client uses Base RPC / `base.json` addresses; no Sepolia factory in prod config
- [ ] Confirm create-contest / entry / secondary paths resolve Base USDC + new factory
- [ ] Smoke UI against Base with a seeded wallet (read balances, open create flow)
- [ ] Commit address JSON + ABIs + client chain lock on `newSettle`

---

## 4. Merge `newSettle` → `main` and deploy

Only after sections 1–3 pass.

- [ ] Rebase/merge latest `main` into `newSettle` if needed; resolve conflicts
- [ ] Merge `newSettle` → `main`
- [ ] Push `main`
- [ ] Build/release image (`pnpm run deploy` / release pipeline)
- [ ] Swarm: roll **web** (`ENABLE_CRON=false`)
- [ ] Cron host: **same** build, `ENABLE_CRON=true`, restart `cron-app`
- [ ] Env cutover on web + cron:

| Check | Done |
|-------|------|
| `OPS_ORACLE_PK` (web + cron) | [ ] |
| Client `VITE_ORACLE_ADDRESS` = OPS_ORACLE address | [ ] |
| `REFERRAL_GROUP_ID` everywhere | [ ] |
| `BASE_RPC_URL` / chain `8453` | [ ] |
| No `rewardDistributorAddress` required | [ ] |
| `GET /api/cron/status` OK | [ ] |

- [ ] Post-deploy prod smoke: create small contest → enter → settle path healthy
- [ ] No settle calls against **old** contest addresses with the new ABI

---

## 5. Rollback / holds

| If this fails… | Hold / do this |
|----------------|----------------|
| Sepolia settle / roles broken | Fix on `newSettle`; do **not** start Base deploy |
| Base deploy or smoke broken | Keep prod on old web/cron; fix on `newSettle` |
| Client Base-only breaks wallet UX | Fix before merge; do not deploy |
| Referral sync `deferred > 0` | Fix missing parents before first settle with `referralNetworkBps > 0` |
| Need to settle an **old** leftover contest | Use **old** settle tooling; never new ABI on old controllers |

---

## Quick command index

| Step | Command |
|------|---------|
| Sepolia deploy | `pnpm run deploy:contracts:sepolia` |
| Base deploy | `pnpm run deploy:contracts:base` |
| Copy ABIs | `pnpm run deploy:copy-artifacts` |
| Bootstrap oracle root | `pnpm --filter server run script:bootstrap-referral-oracle-root` |
| Register organics | `pnpm --filter server run script:register-users-under-oracle-root` |
| Sync invites | `pnpm --filter server run service:batch-sync-referral-graph` |
| Sepolia mint xUSDC | `pnpm run mint-tokens` |
| Merge (last) | `git checkout main && git merge newSettle` |

---

## Open decisions (fill before Sunday)

- [ ] Final OPS_ORACLE address (single key for contest + referral)
- [ ] Deployer ownership: keep / transfer / renounce
- [ ] USDC seed amounts and recipient list
- [ ] First post-cutover contest (sport / entry fee / soft cap)
- [ ] Exact client files / env for “Base only” (wagmi chains, Privy, Vite flags)
