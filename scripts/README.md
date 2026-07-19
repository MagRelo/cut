# Scripts

This directory contains scripts for Play The Cut: deployment, verification, and ad hoc chain interaction.

## Scripts overview

### Deployment (`deploy.js`)

Automates Foundry deployment and follow-up steps:

1. **Environment validation** — required variables (see `contracts/env.example`)
2. **Contract deployment** — `forge script` for `Deploy_sepolia.s.sol` or `Deploy_base.s.sol`
3. **Config updates** — writes `client/src/utils/contracts/{sepolia|base}.json` and matching `server/src/contracts/*.json` with addresses (`paymentTokenAddress`, `contestFactoryAddress`, `referralGraphAddress`, `rewardCalculatorAddress`)
4. **Artifact copy** — copies compiled ABIs to **both** `server/src/contracts/` and `client/src/utils/contracts/` (see `ARTIFACT_COPY` in `deploy.js`: MockUSDC, ContestFactory, ContestController, ReferralGraph, RewardCalculator)
5. **Verification** — optional Blockscout verification via `forge verify-contract` for deployed contracts

**Copy artifacts only** (after `forge build` in `contracts/`, no deploy):

```bash
pnpm run deploy:copy-artifacts
```

### Verification (`verify.js`)

Re-verify already deployed contracts on Blockscout. Useful if verification failed during deploy or contracts were deployed manually.

### Sepolia (`sepolia/`)

Base Sepolia (chain 84532) helpers:

- `mintPaymentToken.js` — mint `MockUSDC` when your wallet is the token owner
- `deployContestFactory.js` — deploy only `ContestFactory` via `Deploy_sepolia_contest_factory.s.sol`
- `deployReferral.js` — deploy referral graph / calculator only
- `pushPayouts.js` — oracle push primary/secondary payouts

Details: [Sepolia Scripts README](./sepolia/README.md).

## Prerequisites

### Environment

Copy and fill `contracts/env.example` → `contracts/.env`:

```bash
cp contracts/env.example contracts/.env
```

Typical variables include `DEPLOYER_PK`, `OPS_ORACLE_PK`, `BASE_SEPOLIA_RPC_URL` / `BASE_RPC_URL`, and `BASESCAN_API_KEY` where needed. See `contracts/env.example` for the full list.

### Tooling

- Node.js 18+
- Foundry (`forge`, `cast`)
- Deployment wallet funded for gas

## Usage

### Deploy & verify (from repo root)

```bash
# Default network in deploy.js (Sepolia)
pnpm run deploy:contracts

pnpm run deploy:contracts:sepolia
pnpm run deploy:contracts:base

# Direct
node scripts/deploy.js [sepolia|base]

# ABIs only (no deploy)
pnpm run deploy:copy-artifacts

pnpm run verify:contracts
pnpm run verify:contracts:sepolia
pnpm run verify:contracts:base

node scripts/verify.js [sepolia|base]
```

### Interaction scripts

```bash
# Sepolia
pnpm run mint-tokens
pnpm run push-primary-payouts
pnpm run push-secondary-payouts
```

Networks: `sepolia` → Base Sepolia (`base_sepolia`, 84532); `base` → Base mainnet (8453).

## What gets deployed

### Base Sepolia (`Deploy_sepolia.s.sol`)

- **MockUSDC** — mintable test USDC
- **ContestFactory**
- **ReferralGraph**
- **RewardCalculator**

### Base mainnet (`Deploy_base.s.sol`)

- **ContestFactory**
- **ReferralGraph**
- **RewardCalculator**

Payment token on Base is **canonical USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) — written into config by `deploy.js`, not deployed.

`ContestController` is not deployed by these scripts; instances are created via `ContestFactory`. Its ABI is still copied for app/server use.

## Configuration & artifacts

**Per-network JSON** (client + server, same shape):

- `client/src/utils/contracts/sepolia.json` / `base.json`
- `server/src/contracts/sepolia.json` / `base.json`

**Copied ABIs** (after deploy or `deploy:copy-artifacts`): listed in `ARTIFACT_COPY` inside `deploy.js`.

## Troubleshooting

1. **Missing env vars** — ensure `contracts/.env` exists and matches `env.example`.
2. **Insufficient ETH** — fund the deployer wallet on the target network.
3. **RPC errors** — check `BASE_SEPOLIA_RPC_URL` / `BASE_RPC_URL`.
4. **Verification warnings** — deploy continues; retry with `verify.js` if needed.
5. **Missing artifacts for copy** — run `forge build` in `contracts/`, then `pnpm run deploy:copy-artifacts`.
6. **`verify.js` address errors** — deploy first; configs must exist under `server/src/contracts/`.

## Security

- Never commit `contracts/.env`.
- Use a dedicated deployer wallet; protect private keys.
- Prefer testnet deploys before mainnet.
