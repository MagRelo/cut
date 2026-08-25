# Base production network

Production runs on **Base** (`8453`) with **canonical USDC**. Staging runs on **Base Sepolia** (`84532`) with **MockUSDC (xUSDC)**.

Players add and withdraw USDC themselves (Coinbase or Robinhood if they do not already have crypto). See in-app [FAQ → Adding & withdrawing funds](client/src/pages/FAQPage.tsx) and [Manage funds](client/src/pages/AccountTransferFundsPage.tsx).

Related:

- [docs/operations/wallet-roles-cashflows.md](docs/operations/wallet-roles-cashflows.md)
- [docs/platform/referral-network.md](docs/platform/referral-network.md) (`ReferralGraph` + `RewardCalculator`)
- [scripts/README.md](scripts/README.md) · [contracts/env.example](contracts/env.example)
- Swarm web vs cron: [swarm/README.md](swarm/README.md)

```text
Prod (playthecut.com)                  →  Base 8453  / USDC
Staging (base-sepolia.playthecut.com)  →  Base Sepolia 84532  / MockUSDC (xUSDC)
Cron                                   →  Base 8453  (`REFERRAL_SYNC_CHAIN_ID=8453`)
```

Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). Sepolia uses **MockUSDC (xUSDC)**.

Settlement ABI: `settleContest(winningEntries, payoutBps, secondaryWinner)` via `ReferralGraph` + `RewardCalculator`. No settlement referral signature, no `RewardDistributor`.

### On-chain roles

Contest role is `operator`. ReferralGraph uses authorized `oracle` for registration. One hot EOA (`OPERATOR_PK`) is wired into both at deploy. Env keys: `OPERATOR_PK` / `OPERATOR_ADDRESS` / `VITE_OPERATOR_ADDRESS`.

| On-chain             | Contract                                     | Cap                                                           | Who                                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `owner`              | `ReferralGraph`                              | `authorizeOracle` / `unauthorizeOracle` / `transferOwnership` | Deployer (`DEPLOYER_PK`), then cold                            |
| `operator`           | `ContestFactory` → every `ContestController` | activate / lock / settle / cancel / merkle / push             | `OPERATOR_PK` address (`VITE_OPERATOR_ADDRESS`)                |
| authorized `oracle`  | `ReferralGraph` (`REFERRAL_GROUP_ID`)        | `register` / `batchRegister` / skiplist                       | Same `OPERATOR_PK` address                                     |
| (not a contest role) | Referral tree parent                         | Organic parent under `REFERRAL_ROOT`; receives fee share      | `contracts/.env` `REFERRAL_PLATFORM_ROOT_ADDRESS` → chain JSON |

`operator` is a trusted escrow/ops agent, not an on-chain truth source. It is distinct from ReferralGraph’s per-group oracle. The operator is not a graph ancestor and is not a referral-fee recipient.

Client bake: prod `VITE_TARGET_CHAIN=mainnet`; staging `VITE_TARGET_CHAIN=testnet`. `REFERRAL_GROUP_ID` is the same bytes32 on Base, Sepolia, server, web, and cron.

---

## Live Base addresses (`8453`)

Addresses live in `client` + `server` `base.json`. Only contests created against this factory use it.

| Contract                     | Address                                      |
| ---------------------------- | -------------------------------------------- |
| USDC (`paymentTokenAddress`) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| ContestFactory               | `0x605E97360f6f8e2bB327331A0452aC9A6f32e265` |
| ReferralGraph                | `0x3dcF689FE19941eA24e52F89E74B617939459d61` |
| RewardCalculator             | `0x0Dde8b39B100124E74b62195031F1C937b9795a3` |
| Platform root                | `0x15c3DC71f1f7Fd975e6c82Ff84e8bcaC0E4b2acb` |

`ReferralGraph.owner` = deployer `0x853C54FB2e9d674A9a158B7F6e8F323d023f03c8`. Factory `operator` and authorized `oracle` = `0x3f76535570b1Bb18D454bC7A8B76f2dEE1726AA5`. Blockscout: [factory](https://base.blockscout.com/address/0x605E97360f6f8e2bB327331A0452aC9A6f32e265), [graph](https://base.blockscout.com/address/0x3dcF689FE19941eA24e52F89E74B617939459d61), [calculator](https://base.blockscout.com/address/0x0Dde8b39B100124E74b62195031F1C937b9795a3).

Tree: platform root → organics under root → invitees under inviter **primary** smart wallet. Never register invitees under the referral root.

---

## Staging Sepolia addresses (`84532`)

Keep MockUSDC. ContestFactory was deployed against the soak graph (do **not** run `deploy:contracts:sepolia` — that redeploys MockUSDC).

| Contract                         | Address                                      |
| -------------------------------- | -------------------------------------------- |
| MockUSDC (`paymentTokenAddress`) | `0x6662473494b64c6aec18E703E839AF26d371f570` |
| ContestFactory                   | `0x6e5cC151E1271eD82cdf39B431B18Cd02cEFA016` |
| ReferralGraph                    | `0x820bDEe2FB655eFCfaF82971F7e827a5141417bB` |
| RewardCalculator                 | `0xE2E7184C7Fc5A35Be22c23A87Ca2d7f6E2d6B72c` |

Same values in `client/src/utils/contracts/sepolia.json` and `server/src/contracts/sepolia.json`.

### Leftover Sepolia contests

Old Sepolia contest addresses (prior factories) stay on the previous ABI. Settle leftovers with **old** tooling; never the current `settleContest` against those controllers.

---

## Deploy Base contracts

`Deploy_base.s.sol` deploys three contracts in one broadcast. Payment token is **not** deployed — `scripts/deploy.js` writes canonical Base USDC into config.

| Contract           | Notes                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `ContestFactory`   | New contests only; immutable `operator` = `OPERATOR_PK` address                                |
| `ReferralGraph`    | `initialOwner` = deployer; authorized `oracle` for `REFERRAL_GROUP_ID` = `OPERATOR_PK` address |
| `RewardCalculator` | Stateless                                                                                      |

Preconditions: `OPERATOR_PK` distinct from deployer; `REFERRAL_GROUP_ID` matches server / `VITE_REFERRAL_GROUP_ID`; deployer funded with **~0.02 ETH** on Base; operator EOA funded with Base ETH; `REFERRAL_PLATFORM_ROOT_ADDRESS` differs from the operator.

```bash
# contracts/.env: DEPLOYER_PK, OPERATOR_PK, BASE_RPC_URL, REFERRAL_GROUP_ID, REFERRAL_PLATFORM_ROOT_ADDRESS
pnpm run deploy:contracts:base
```

`deploy.js` writes `client` + `server` `base.json` and copies ABIs. Forge registers the platform root under `REFERRAL_ROOT` in the same run.

### Rebuild referral graph on Base

```bash
# server/.env: REFERRAL_SYNC_CHAIN_ID=8453 (and Base RPC / OPERATOR_PK funded)
pnpm --filter server run script:rematerialize-referral-graph --dry-run
pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
```

Maps DB organics/invites onto the graph: platform root → organics under root → invitees under inviter primary. Rematerialize exits non-zero on parent audit mismatch.

---

## Rollback / leftover holds

| If this fails…                                | Hold / do this                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Client Base wallet UX broken                  | Revert `VITE_TARGET_CHAIN` to `testnet`; keep Base contracts as-is     |
| Referral sync `deferred > 0`                  | Fix missing parents before settle with `referralNetworkBps > 0`        |
| Need to settle a **Sepolia leftover** contest | Use **old** settle tooling; never new ABI on old controllers           |

---

## Quick command index

| Step                                  | Command                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Base deploy                           | `pnpm run deploy:contracts:base`                                              |
| Copy ABIs                             | `pnpm run deploy:copy-artifacts`                                              |
| Verify Base                           | `pnpm run verify:contracts:base`                                              |
| Rematerialize graph                   | `pnpm --filter server run script:rematerialize-referral-graph --reset-hashes` |
| Bootstrap referral root               | `pnpm --filter server run script:bootstrap-referral-root`                     |
| Register organics only                | `pnpm --filter server run script:register-users-under-referral-root`          |
| Sync invites (cron)                   | `pnpm --filter server run service:batch-sync-referral-graph`                  |
| Sepolia factory-only (keeps MockUSDC) | `pnpm run sepolia:deploy-contest-factory`                                     |
| Sepolia mint xUSDC                    | `pnpm run mint-tokens`                                                        |
| Prod image                            | `pnpm run deploy` then `pnpm run launch`                                      |
| Staging image                         | `pnpm run deploy:staging` then `pnpm run launch:staging`                      |
