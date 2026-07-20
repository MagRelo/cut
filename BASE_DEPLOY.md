# Base mainnet cutover

Ship `newSettle` to production on **Base Sepolia**, soak for about a week while preparing **Base** mainnet, then flip the client to Base last.

Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). Sepolia uses **MockUSDC (xUSDC)**.

Related:

- [docs/operations/wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md)
- [docs/platform/referral-network.md](docs/platform/referral-network.md) (`ReferralGraph` + `RewardCalculator`)
- [scripts/README.md](scripts/README.md) · [contracts/env.example](contracts/env.example)
- Swarm web vs cron: [swarm/README.md](swarm/README.md)

```text
1. Sepolia deploy + smoke     →    2. Merge → deploy prod (still Sepolia)
                                         ↓
3. ~1 week Sepolia soak            3. In parallel: Base contracts + roles + smoke
                                         ↓
                                   4. Client → Base only (last)
```

ABI: `settleContest(entries, bps)` via `ReferralGraph` + `RewardCalculator` (no settlement referral signature, no `RewardDistributor`).

---

## 0. Preconditions

- [x] Work on `**newSettle**` until section 2 merge; prod stays on pre-`newSettle` until then
- [x] Prod DB popularity migration (`20260715200000_contest_popularity_scoring`) — done if already applied
- [x] `ReferralGraph` ownership remains on the **deployer** (cold after broadcast; no transfer / renounce)
- [x] Document addresses (before Sepolia deploy):

| Role                            | Env key         | Address | Notes                                                                   |
| ------------------------------- | --------------- | ------- | ----------------------------------------------------------------------- |
| Deployer (cold)                 | `DEPLOYER_PK`   | TBD     | `contracts/.env`, forge broadcast; keeps `ReferralGraph` ownership      |
| OPS_ORACLE (contest + referral) | `OPS_ORACLE_PK` | TBD     | One EOA; authed as ReferralGraph oracle at deploy. **Not** the deployer |

- [x] Fund deployer with Sepolia ETH (section 1) and later **~0.02 ETH** on Base (section 3)
- [x] Fund OPS_ORACLE with enough **ETH** on each chain it will sign on (Sepolia for soak; Base for section 3+)
- [x] Confirm `REFERRAL_GROUP_ID` (bytes32) — same value for Sepolia + Base and in `server` / web / cron / `VITE_REFERRAL_GROUP_ID`

USDC treasury / wallet seeding is funded outside this plan.

---

## 1. Sepolia deploy + smoke (`newSettle`)

Prove contracts, roles, referral bootstrap, and full settle/claim on testnet. Local or staging app pointed at Sepolia — **not** prod yet.

### 1a. Deploy contracts

Keep existing MockUSDC. Deploy referral stack and factory separately (do **not** run `deploy:contracts:sepolia` — that redeploys MockUSDC). Partial scripts do not rewrite app config; patch both `sepolia.json` files by hand.

```bash
# contracts/.env: DEPLOYER_PK, OPS_ORACLE_PK, BASE_SEPOLIA_RPC_URL, REFERRAL_GROUP_ID
pnpm run sepolia:deploy-referral
pnpm run sepolia:deploy-contest-factory
# then patch client + server sepolia.json (keep paymentTokenAddress)
pnpm run deploy:copy-artifacts
pnpm run verify:contracts:sepolia
```

- [x] Fresh `ContestFactory` + `ReferralGraph` + `RewardCalculator` (MockUSDC unchanged)
- [x] `client` + `server` `sepolia.json` updated:
  - `contestFactoryAddress` = `0xf849E0910a3411e62018F727B902A494387E56A8`
  - `referralGraphAddress` = `0x82b6029706825361379272B1B8679C858D779Ca6`
  - `rewardCalculatorAddress` = `0xbABc5295825E4AA8D10C098a22f78364309d45fe`
  - `paymentTokenAddress` = existing MockUSDC `0x6662473494b64c6aec18E703E839AF26d371f570`
- [x] `pnpm run deploy:copy-artifacts`
- [x] Verify on Blockscout (`pnpm run verify:contracts:sepolia`)

### 1b. Roles on Sepolia

- [x] `OPS_ORACLE_PK` set at deploy; its address is the ReferralGraph oracle (Sepolia soak: same EOA as deployer)
- [x] `ReferralGraph` owner = deployer (unchanged)
- [x] Server/local: `OPS_ORACLE_PK` matches on-chain contest + referral oracle
- [x] `REFERRAL_GROUP_ID` matches on-chain auth
- [x] `REFERRAL_SYNC_CHAIN_ID=84532`

### 1c. Rebuild referral graph

```bash
pnpm --filter server run script:rematerialize-referral-graph --dry-run
pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
```

Uses `REFERRAL_SYNC_CHAIN_ID` (84532). Maps DB organics/invites onto the graph: oracle → organics under oracle → invitees under inviter **primary** smart wallet. Never registers invitees under oracle. Exits non-zero on parent audit mismatch.

- [x] Oracle registered under `REFERRAL_ROOT`
- [x] Organics under oracle (34)
- [x] Invite chains match DB (`referredByUserId` → inviter primary); audit clean (11/11)
- [x] Spot-check DipChutney → One Direction; User 0x16ca → DipChutney; User 0x4151 → User 0x16ca

New graph (after rematerialize redeploy):

- ReferralGraph `0x82b6029706825361379272B1B8679C858D779Ca6`
- RewardCalculator `0xbABc5295825E4AA8D10C098a22f78364309d45fe`

### 1d. Smoke / acceptance

- [x] Create contest on new graph: **rematerializeSmoke** `0x4AEB6018B063589B392F808007036DC1844ef48B` / DB `cmrp9q7er0001mdxrul1k8be1` (10 xUSDC, 700 bps)
- [x] Enter lineup / primary deposit (ephemeral entrant registered under DipChutney)
- [x] Lock → settle — **2-arg** `settleContest` (`0x88e08db7…51b8`)
- [x] Referral fee transfers + `OnchainPayment` `REFERRAL` rows (**3**): DipChutney 0.357 / One Direction 0.214 / oracle 0.129 xUSDC
- [x] Push primary (`0x62f9d517…458a5`)
- [x] Close after expiry (incl. CANCELLED if needed)
- [x] **Gate:** rematerialize + invite-chain fee smoke green (close optional)

Verified: entrant → DipChutney → One Direction → oracle (not oracle-only).

---

## 2. Merge `newSettle` → `main` and deploy (prod stays on Sepolia)

Ship the new settle stack to production while the client remains on **Base Sepolia** (`VITE_TARGET_CHAIN=testnet`, chain `84532`).

- [x] Rebase/merge latest `main` into `newSettle` if needed; resolve conflicts
- [x] Merge `newSettle` → `main`
- [x] Push `main`
- [x] Build/release image (`pnpm run deploy` / release pipeline)
- [x] Swarm: roll **web** (`ENABLE_CRON=false`)
- [x] Cron host: **same** build, `ENABLE_CRON=true`, restart `cron-app`
- [x] Env on web + cron (Sepolia soak). Inventories: `[swarm/env/web.env.example](swarm/env/web.env.example)`, `[swarm/env/cron.env.example](swarm/env/cron.env.example)`, `[client/.env.example](client/.env.example)` (bake `VITE_*` before image build):

| Check                                               | Done |
| --------------------------------------------------- | ---- |
| `OPS_ORACLE_PK` (web + cron)                        | [ ]  |
| Client `VITE_ORACLE_ADDRESS` = OPS_ORACLE address   | [ ]  |
| `VITE_TARGET_CHAIN=testnet` (prod stays on Sepolia) | [ ]  |
| `REFERRAL_GROUP_ID` everywhere                      | [ ]  |
| `BASE_SEPOLIA_RPC_URL` / chain `84532`              | [ ]  |
| `REFERRAL_SYNC_CHAIN_ID=84532`                      | [ ]  |
| No `rewardDistributorAddress` required              | [ ]  |
| `GET /api/cron/status` OK                           | [ ]  |

- [x] Post-deploy prod smoke on Sepolia: create small contest → enter → settle path healthy
- [x] **Gate:** section 3 Base work can proceed in parallel with the soak; do **not** flip the client to Base yet

---

## 3. Sepolia soak (~1 week) + Base prep in parallel

Prod users and contests remain on Sepolia. Prepare Base mainnet without switching the client.

### 3a. Soak checklist (prod / Sepolia)

- [ ] At least one full contest lifecycle on prod Sepolia (create → enter → lock → settle → claim)
- [ ] Referral fees + sync look healthy under real traffic
- [ ] Cron settle / lock / close paths stable
- [ ] No settle calls against **old** contest addresses with the new ABI (use old tooling for leftovers)

### 3b. Deploy Base contracts

Same stack as Sepolia, minus MockUSDC. Can run from `main` or a short-lived branch once section 2 is merged.

`Deploy_base.s.sol` deploys:

| Contract           | Notes                                                          |
| ------------------ | -------------------------------------------------------------- |
| `ContestFactory`   | New contests only                                              |
| `ReferralGraph`    | `initialOwner` = deployer; oracle auth for `REFERRAL_GROUP_ID` |
| `RewardCalculator` | Stateless                                                      |

Payment token is **not** deployed — canonical Base USDC is written into config by `scripts/deploy.js`.

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
- [ ] Confirm `ReferralGraph` owner remains deployer

**Important:** Old Base contests (if any) stay on the previous factory/ABI. Only **new** contests use this factory.

### 3c. Roles on Base

- [ ] Same OPS_ORACLE / `REFERRAL_GROUP_ID` story as Sepolia (section 1b), now for chain `8453`
- [ ] Ops scripts / local smoke: `REFERRAL_SYNC_CHAIN_ID=8453`
- [ ] OPS_ORACLE funded with Base ETH

### 3d. Rebuild referral graph on Base

Same rematerialize script as Sepolia; point env at Base:

```bash
# server/.env: REFERRAL_SYNC_CHAIN_ID=8453 (and Base RPC / OPS_ORACLE funded)
pnpm --filter server run script:rematerialize-referral-graph --dry-run
pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
```

- [ ] Oracle → `REFERRAL_ROOT`
- [ ] Organics under oracle; invitees under inviter primary on `8453`
- [ ] Audit clean (zero parent mismatches / deferred)

### 3e. Base smoke (pre–client flip)

Use a local or staging build pointed at Base — **not** the Sepolia prod client. Test wallets must already hold Base USDC (seeded outside this plan).

- [ ] Create a **small** contest on the new factory
- [ ] Enter → activate → lock → settle → referral fees → claim/push
- [ ] **Gate:** do not flip the client to Base until soak + this smoke are green

---

## 4. Client → Base only (last)

After ~1 week on Sepolia and Base smoke is green, point production wallets at Base `8453`.

- [ ] Prod client: `VITE_TARGET_CHAIN=mainnet` (Base only for user-facing chain)
- [ ] Web + cron env cutover to Base:

| Check                                                                | Done |
| -------------------------------------------------------------------- | ---- |
| `BASE_RPC_URL` / chain `8453`                                        | [ ]  |
| `REFERRAL_SYNC_CHAIN_ID=8453`                                        | [ ]  |
| Address JSON / ABIs resolve `base.json` (new factory + USDC)         | [ ]  |
| `VITE_ORACLE_ADDRESS` / `OPS_ORACLE_PK` unchanged and funded on Base | [ ]  |
| `REFERRAL_GROUP_ID` unchanged                                        | [ ]  |

- [ ] Rebuild/redeploy web (and cron if env-only changes need a restart)
- [ ] Smoke UI on Base: balances, create contest, entry path
- [ ] First real Base contest (small entry / soft cap)
- [ ] Confirm create / entry / secondary resolve Base USDC + new factory

---

## 5. Rollback / holds

| If this fails…                             | Hold / do this                                                     |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Sepolia settle / roles broken              | Fix on `newSettle`; do **not** merge                               |
| Merge/deploy broken on Sepolia prod        | Roll web/cron back to previous image; fix on branch                |
| Referral sync `deferred > 0`               | Fix missing parents before settle with `referralNetworkBps > 0`    |
| Base deploy or smoke broken                | Keep prod on Sepolia; fix Base prep; do **not** flip client        |
| Client Base flip breaks wallet UX          | Revert `VITE_TARGET_CHAIN` to `testnet`; keep Base contracts as-is |
| Need to settle an **old** leftover contest | Use **old** settle tooling; never new ABI on old controllers       |

---

## Quick command index

| Step                        | Command                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| Sepolia deploy              | `pnpm run deploy:contracts:sepolia`                                           |
| Base deploy                 | `pnpm run deploy:contracts:base`                                              |
| Copy ABIs                   | `pnpm run deploy:copy-artifacts`                                              |
| Rematerialize graph         | `pnpm --filter server run script:rematerialize-referral-graph --reset-hashes` |
| Bootstrap oracle root       | `pnpm --filter server run script:bootstrap-referral-oracle-root`              |
| Register organics only      | `pnpm --filter server run script:register-users-under-oracle-root`            |
| Sync invites (cron)         | `pnpm --filter server run service:batch-sync-referral-graph`                  |
| Sepolia mint xUSDC          | `pnpm run mint-tokens`                                                        |
| Merge (after Sepolia smoke) | `git checkout main && git merge newSettle`                                    |

---

## Open decisions

- [ ] Final OPS_ORACLE address (single key for contest + referral)
- [ ] First Base contest after client flip (sport / entry fee / soft cap)
- [ ] Exact soak exit criteria before section 4 (e.g. N contests settled, zero critical incidents)
