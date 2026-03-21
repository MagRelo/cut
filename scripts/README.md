# Scripts

This directory contains scripts for the Cut project: deployment, verification, and ad hoc chain interaction.

## Scripts overview

### Deployment (`deploy.js`)

Automates Foundry deployment and follow-up steps:

1. **Environment validation** — required variables (see `contracts/env.example`)
2. **Contract deployment** — `forge script` for `Deploy_sepolia.s.sol` or `Deploy_base.s.sol`
3. **Config updates** — writes `client/src/utils/contracts/{sepolia|base}.json` and matching `server/src/contracts/*.json` with addresses (`paymentTokenAddress`, `platformTokenAddress`, `depositManagerAddress`, `contestFactoryAddress`, `aavePoolAddress`, `referralGraphAddress`, `rewardDistributorAddress`)
4. **Artifact copy** — copies compiled ABIs to **both** `server/src/contracts/` and `client/src/utils/contracts/` (see `ARTIFACT_COPY` in `deploy.js`: MockUSDC, DepositManager, ContestFactory, ContestController, PlatformToken, ReferralGraph, RewardDistributor)
5. **Verification** — optional Blockscout verification via `forge verify-contract` for deployed contracts

**Copy artifacts only** (after `forge build` in `contracts/`, no deploy):

```bash
pnpm run deploy:copy-artifacts
```

### Verification (`verify.js`)

Re-verify already deployed contracts on Blockscout. Useful if verification failed during deploy or contracts were deployed manually.

### Sepolia (`sepolia/`)

Base Sepolia (chain 84532) helpers:

- `depositUSDC.js` — deposit mock USDC into `DepositManager`, receive CUT (`xCUT`)
- `mintPaymentToken.js` — mint `MockUSDC` when your wallet is the token owner

### Base mainnet (`base/`)

Base (chain 8453) helpers:

- `depositUSDC.js` — deposit real USDC for CUT
- `checkPlatformTokenBalance.js` — read-only CUT / backing info
- `emergencyWithdrawAll.js` — owner-only emergency pull (see script warnings)

Details: [Base Scripts README](./base/README.md).

## Prerequisites

### Environment

Copy and fill `contracts/env.example` → `contracts/.env`:

```bash
cp contracts/env.example contracts/.env
```

Typical variables include `PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL` / `BASE_RPC_URL`, and `BASESCAN_API_KEY` where needed. See `contracts/env.example` for the full list.

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
pnpm run deposit-usdc

# Base mainnet
pnpm run base:deposit-usdc

# Or run files directly
node scripts/base/checkPlatformTokenBalance.js
node scripts/base/emergencyWithdrawAll.js
```

Networks: `sepolia` → Base Sepolia (`base_sepolia`, 84532); `base` → Base mainnet (8453).

## What gets deployed

### Base Sepolia (`Deploy_sepolia.s.sol`)

- **MockUSDC** — mintable test USDC  
- **PlatformToken** (`xCUT`)  
- **DepositManager** — USDC → Aave V3 pool on Sepolia (see script constants)  
- **ContestFactory**  
- **ReferralGraph**  
- **RewardDistributor**

### Base mainnet (`Deploy_base.s.sol`)

- **PlatformToken** (`CUT`)  
- **DepositManager** — canonical Base USDC + Aave V3 pool addresses (in script)  
- **ContestFactory**  
- **ReferralGraph**  
- **RewardDistributor**

`ContestController` is not deployed by these scripts; instances are created via `ContestFactory`. Its ABI is still copied for app/server use.

## Configuration & artifacts

**Per-network JSON** (client + server, same shape):

- `client/src/utils/contracts/sepolia.json` / `base.json`
- `server/src/contracts/sepolia.json` / `base.json`

**Copied ABIs** (after deploy or `deploy:copy-artifacts`): listed in `ARTIFACT_COPY` inside `deploy.js` — includes `ContestController.json`, not legacy escrow/compound artifacts.

## Example deploy output (illustrative)

```
🚀 Starting deployment to base_sepolia

=== Checking environment variables ===
✅ Environment variables check passed

=== Deploying contracts to base_sepolia ===
ℹ️ Running: forge script script/Deploy_sepolia.s.sol ...
✅ Deployed contracts

=== Updating configuration files for base_sepolia ===
✅ Updated client config: .../client/src/utils/contracts/sepolia.json
✅ Updated server config: .../server/src/contracts/sepolia.json

=== Copying contract artifacts to server and client ===
✅ Copied MockUSDC.json to server
✅ Copied ContestController.json to client
...

=== Verifying contracts on https://base-sepolia.blockscout.com ===
ℹ️ Verifying MockUSDC at 0x...
✅ Verified MockUSDC
...
```

Verification order in `deploy.js`: MockUSDC (Sepolia only), PlatformToken, DepositManager, ContestFactory, ReferralGraph, RewardDistributor.

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
