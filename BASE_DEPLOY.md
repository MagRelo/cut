# Base mainnet cutover

Production is live on **Base Sepolia** (`84532`) with the current contest + referral stack. Soak is complete, including factory and graph redeploys. Remaining work is Base mainnet contracts, graph rematerialize, staging smoke, then flip the production client to **Base** (`8453`).

Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). Sepolia uses **MockUSDC (xUSDC)**.

Related:

- [docs/operations/wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md)
- [docs/platform/referral-network.md](docs/platform/referral-network.md) (`ReferralGraph` + `RewardCalculator`)
- [scripts/README.md](scripts/README.md) · [contracts/env.example](contracts/env.example)
- Swarm web vs cron: [swarm/README.md](swarm/README.md)

```text
Prod (playthecut.com)     →  Base Sepolia 84532   ← you are here
Staging (base-sepolia…)   →  Base Sepolia 84532

1. Deploy Base contracts + roles
2. Rematerialize referral graph on 8453
3. Staging smoke on Base (retarget bake; prod stays Sepolia)
4. Prod client → Base only (last)
```

Settlement ABI: `settleContest(winningEntries, payoutBps, secondaryWinner)` via `ReferralGraph` + `RewardCalculator`. No settlement referral signature, no `RewardDistributor`.

### On-chain roles

Contest role is **`operator`**. ReferralGraph uses authorized **`oracle`** for registration. One hot EOA (`OPERATOR_PK`) is wired into both at deploy. Env keys: `OPERATOR_PK` / `OPERATOR_ADDRESS` / `VITE_OPERATOR_ADDRESS`.

| On-chain | Contract | Cap | Who |
| -------- | -------- | --- | --- |
| `owner` | `ReferralGraph` | `authorizeOracle` / `unauthorizeOracle` / `transferOwnership` | Deployer (`DEPLOYER_PK`), then cold |
| `operator` | `ContestFactory` → every `ContestController` | activate / lock / settle / cancel / merkle / push | `OPERATOR_PK` address (`VITE_OPERATOR_ADDRESS`) |
| authorized `oracle` | `ReferralGraph` (`REFERRAL_GROUP_ID`) | `register` / `batchRegister` / skiplist | Same `OPERATOR_PK` address |
| (not a contest role) | Referral tree parent | Organic parent under `REFERRAL_ROOT`; receives fee share | `contracts/.env` `REFERRAL_PLATFORM_ROOT_ADDRESS` → chain JSON |

`operator` is a trusted escrow/ops agent, not an on-chain truth source. It is distinct from ReferralGraph’s per-group oracle. The operator is not a graph ancestor and is not a referral-fee recipient.

---

## Current state (Sepolia)

`newSettle` is on `main`. Prod and staging wallets target Sepolia. Cron syncs the referral graph on `84532`.

| Host | Image / role | Chain |
| ---- | ------------ | ----- |
| [playthecut.com](https://playthecut.com) | `cut_web` (prod), `ENABLE_CRON=false` | Sepolia `84532` |
| [base-sepolia.playthecut.com](https://base-sepolia.playthecut.com) | `cut_web-staging` | Sepolia `84532` |
| Cron Pi | `cron-app`, `ENABLE_CRON=true` | Sepolia `84532` |

### Live Sepolia addresses

Keep MockUSDC. ContestFactory was redeployed against the soak graph (do **not** run `deploy:contracts:sepolia` — that redeploys MockUSDC).

| Contract | Address |
| -------- | ------- |
| MockUSDC (`paymentTokenAddress`) | `0x6662473494b64c6aec18E703E839AF26d371f570` |
| ContestFactory | `0x6e5cC151E1271eD82cdf39B431B18Cd02cEFA016` |
| ReferralGraph | `0x820bDEe2FB655eFCfaF82971F7e827a5141417bB` |
| RewardCalculator | `0xE2E7184C7Fc5A35Be22c23A87Ca2d7f6E2d6B72c` |

Same values in `client/src/utils/contracts/sepolia.json` and `server/src/contracts/sepolia.json`.

### Roles and graph (Sepolia)

| Role | Status |
| ---- | ------ |
| `ReferralGraph.owner` | Deployer (`DEPLOYER_PK`); cold after broadcast (no transfer / renounce) |
| `ContestFactory.operator` | `OPERATOR_PK` address; factory immutable on every contest |
| ReferralGraph authorized `oracle` | Same `OPERATOR_PK` address, scoped to `REFERRAL_GROUP_ID` |
| Referral platform root | `REFERRAL_PLATFORM_ROOT_ADDRESS` in `contracts/.env` at deploy; persisted as `referralPlatformRootAddress` in chain JSON. Registered under `REFERRAL_ROOT`. Deploy reverts if it equals the operator. No private key in web/cron |
| `REFERRAL_GROUP_ID` | Same bytes32 on Sepolia, Base, server, web, cron, and `VITE_REFERRAL_GROUP_ID` |
| `REFERRAL_SYNC_CHAIN_ID` | `84532` until section 4 |

Soak used the **same EOA** for deployer and `OPERATOR_PK`. Split them on Base.

Tree: platform root → organics under root → invitees under inviter **primary** smart wallet. Never register invitees under the referral root. Rematerialize exits non-zero on parent audit mismatch.

### Prod soak (done)

- Full contest lifecycle on prod Sepolia (create → enter → lock → settle → claim/push)
- Referral fees + `OnchainPayment` `REFERRAL` rows under real traffic
- Cron lock / settle / referral sync stable
- Client bake `VITE_TARGET_CHAIN=testnet`

Old Sepolia contest addresses (prior factories) stay on the previous ABI. Settle leftovers with **old** tooling; never the current `settleContest` against those controllers.

---

## 1. Deploy Base contracts

`Deploy_base.s.sol` deploys three contracts in one broadcast. Payment token is **not** deployed — `scripts/deploy.js` writes canonical Base USDC into config.

| Contract | Notes |
| -------- | ----- |
| `ContestFactory` | New contests only; immutable `operator` = `OPERATOR_PK` address |
| `ReferralGraph` | `initialOwner` = deployer; authorized `oracle` for `REFERRAL_GROUP_ID` = `OPERATOR_PK` address |
| `RewardCalculator` | Stateless |

`client` + `server` `base.json` currently list `contestFactoryAddress` `0x87446Ef8ff9B142ADaa8cAb44bf8B12c27E5F0C3`. That is a leftover from the pre-cutover stack, **not** this factory. Overwrite it on deploy. Contest create also requires `referralGraphAddress` and `rewardCalculatorAddress` — both missing until this step.

### 1a. Preconditions

- [ ] `OPERATOR_PK` set at deploy (address becomes factory `operator` + ReferralGraph authorized `oracle`). Prefer a **distinct** EOA from the deployer
- [ ] `REFERRAL_GROUP_ID` matches Sepolia / server / `VITE_REFERRAL_GROUP_ID`
- [ ] Deployer funded with **~0.02 ETH** on Base (quiet L1 is cheaper; this covers retries)
- [ ] Operator EOA funded with Base ETH (gas for settle / push / `register`)
- [ ] `REFERRAL_PLATFORM_ROOT_ADDRESS` decided and differs from the operator (fees must not flow to the hot wallet)

USDC treasury / wallet seeding is funded outside this plan.

### 1b. Broadcast

```bash
# contracts/.env: DEPLOYER_PK, OPERATOR_PK, BASE_RPC_URL, REFERRAL_GROUP_ID, REFERRAL_PLATFORM_ROOT_ADDRESS
pnpm run deploy:contracts:base
```

`deploy.js` writes `client` + `server` `base.json` (`paymentTokenAddress`, `contestFactoryAddress`, `referralGraphAddress`, `rewardCalculatorAddress`, `referralPlatformRootAddress`) and copies ABIs. Forge registers the platform root under `REFERRAL_ROOT` in the same run.

- [ ] Forge broadcast OK; capture addresses
- [ ] `base.json` (client + server) has USDC + factory + graph + calculator + platform root
- [ ] `pnpm run deploy:copy-artifacts` if ABIs were not copied in the same run
- [ ] Verify (`pnpm run verify:contracts:base`)
- [ ] `ReferralGraph.owner` remains deployer
- [ ] Factory `operator()` and graph `isAuthorizedOracle(ops, REFERRAL_GROUP_ID)` = `OPERATOR_PK` address
- [ ] Platform root registered under `REFERRAL_ROOT` and differs from the operator

Only **new** contests use this factory.

### 1c. Roles on Base

- [ ] Same operator + authorized-oracle / `REFERRAL_GROUP_ID` story as Sepolia, now for chain `8453`
- [ ] Ops scripts / local smoke: `REFERRAL_SYNC_CHAIN_ID=8453`
- [ ] Client bake for staging smoke: `VITE_OPERATOR_ADDRESS` = factory `operator`

---

## 2. Rebuild referral graph on Base

Same rematerialize script as Sepolia; point env at Base. Prod cron stays on `84532` until section 4.

```bash
# server/.env: REFERRAL_SYNC_CHAIN_ID=8453 (and Base RPC / OPERATOR_PK funded)
pnpm --filter server run script:rematerialize-referral-graph --dry-run
pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
```

Maps DB organics/invites onto the new graph: platform root → organics under root → invitees under inviter primary. Never registers invitees under the referral root.

- [ ] Platform root registered under `REFERRAL_ROOT`
- [ ] Organics under platform root; invitees under inviter primary on `8453`
- [ ] Audit clean (zero parent mismatches / deferred)

---

## 3. Base smoke (pre–client flip)

Use staging [`https://base-sepolia.playthecut.com`](https://base-sepolia.playthecut.com) ([swarm/README.md](swarm/README.md) **Staging**) — **not** prod at `playthecut.com`. Retarget staging’s bake (`client/.env.staging`) and `web-staging.env` at chain `8453` / USDC. Test wallets must already hold Base USDC (seeded outside this plan).

- [ ] Staging bake: `VITE_TARGET_CHAIN=mainnet` (or equivalent RPC/chain for Base)
- [ ] Staging server: `REFERRAL_SYNC_CHAIN_ID=8453`, `BASE_RPC_URL` set
- [ ] Privy: Base mainnet allowed for the staging origin
- [ ] Pimlico sponsorship policy covers Base if paymaster is enabled
- [ ] Create a **small** contest on the new factory
- [ ] Enter → activate → lock → settle → referral fees → claim/push
- [ ] Confirm fees go down the invite chain (operator is not a fee recipient)
- [ ] **Gate:** do not flip the prod client until this smoke is green

Staging hostname can stay `base-sepolia.playthecut.com` for this smoke; it is the staging slot, not a chain name.

---

## 4. Prod client → Base only (last)

Point production wallets at Base `8453`. Keep Sepolia contracts as-is for leftover contests.

- [ ] Prod client: `VITE_TARGET_CHAIN=mainnet` in `client/.env.production` (bake-time; not Swarm env)
- [ ] Privy: Base mainnet allowed for `https://playthecut.com`
- [ ] Pimlico policy / paymaster valid on Base if used
- [ ] Web + cron env cutover:

| Check | Done |
| ----- | ---- |
| `BASE_RPC_URL` / chain `8453` | [ ] |
| `REFERRAL_SYNC_CHAIN_ID=8453` | [ ] |
| Address JSON / ABIs resolve `base.json` (new factory + USDC + platform root) | [ ] |
| `VITE_OPERATOR_ADDRESS` / `OPERATOR_PK` funded on Base | [ ] |
| `REFERRAL_GROUP_ID` unchanged | [ ] |

- [ ] Rebuild/redeploy web (`pnpm run deploy` / `pnpm run launch`); restart cron if env-only (`cron-pi.md`)
- [ ] Smoke UI on Base: balances, create contest, entry path
- [ ] First real Base contest (small entry / soft cap)
- [ ] Confirm create / entry / secondary resolve Base USDC + new factory

After cutover, staging can return to Sepolia (`VITE_TARGET_CHAIN=testnet`, `REFERRAL_SYNC_CHAIN_ID=84532`) as the testnet slot.

---

## Rollback / holds

| If this fails… | Hold / do this |
| -------------- | -------------- |
| Base deploy or rematerialize broken | Keep prod on Sepolia; fix Base prep; do **not** flip client |
| Staging Base smoke broken | Keep prod on Sepolia; fix staging bake / graph; do **not** flip client |
| Client Base flip breaks wallet UX | Revert `VITE_TARGET_CHAIN` to `testnet`; keep Base contracts as-is |
| Referral sync `deferred > 0` | Fix missing parents before settle with `referralNetworkBps > 0` |
| Need to settle a **Sepolia leftover** contest | Use **old** settle tooling; never new ABI on old controllers |

---

## Quick command index

| Step | Command |
| ---- | ------- |
| Base deploy | `pnpm run deploy:contracts:base` |
| Copy ABIs | `pnpm run deploy:copy-artifacts` |
| Verify Base | `pnpm run verify:contracts:base` |
| Rematerialize graph | `pnpm --filter server run script:rematerialize-referral-graph --reset-hashes` |
| Bootstrap referral root | `pnpm --filter server run script:bootstrap-referral-root` |
| Register organics only | `pnpm --filter server run script:register-users-under-referral-root` |
| Sync invites (cron) | `pnpm --filter server run service:batch-sync-referral-graph` |
| Sepolia factory-only (keeps MockUSDC) | `pnpm run sepolia:deploy-contest-factory` |
| Sepolia mint xUSDC | `pnpm run mint-tokens` |
| Prod image | `pnpm run deploy` then `pnpm run launch` |
| Staging image | `pnpm run deploy:staging` then `pnpm run launch:staging` |

---

## Open decisions

- [ ] Final Base operator address (`OPERATOR_PK`, distinct from deployer)
- [ ] Document deployer + platform-root addresses in [wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md) after broadcast
- [ ] First Base contest after client flip (sport / entry fee / soft cap)
