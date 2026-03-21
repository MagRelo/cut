# Base mainnet scripts (Base, chain 8453)

Helpers for contracts deployed by `contracts/script/Deploy_base.s.sol`. Env vars live in **`contracts/.env`**. Scripts load `contracts/.env` relative to `process.cwd()` — **run from the repository root** (see examples below), or `dotenv` will not find your file.

## Scripts

### `depositUSDC.js`

Deposits **real USDC** on Base into **DepositManager** and receives **PlatformToken (CUT)**. Uses canonical Base USDC when addresses come from deployment config.

**Required env:** `PRIVATE_KEY`

**Optional env:** `BASE_RPC_URL`, `USDC_AMOUNT` (6 decimals; default `1000000` = 1 USDC), `USE_LATEST_DEPLOYMENT`, `DEPOSIT_MANAGER_ADDRESS`, `USDC_ADDRESS`, `PLATFORM_TOKEN_ADDRESS` (manual mode)

### `checkPlatformTokenBalance.js`

Read-only: CUT **PlatformToken** info, wallet balance, optional extra addresses, and DepositManager / Aave backing context when addresses are available.

**Required env:** `PRIVATE_KEY` (for provider + wallet context)

**Optional env:** `BASE_RPC_URL`, `USE_LATEST_DEPLOYMENT`, `CHECK_ADDRESSES` (comma-separated), `DEPOSIT_MANAGER_ADDRESS`, `USDC_ADDRESS`, `PLATFORM_TOKEN_ADDRESS`

### `emergencyWithdrawAll.js`

**Owner-only** emergency path on **DepositManager**: withdraws USDC (including funds reflected via Aave). **High risk** — only use when you understand the protocol implications. Optional `RECIPIENT_ADDRESS` (defaults to the owner wallet).

**Required env:** `PRIVATE_KEY` (must be DepositManager owner)

**Optional env:** `BASE_RPC_URL`, `USE_LATEST_DEPLOYMENT`, `RECIPIENT_ADDRESS`, `DEPOSIT_MANAGER_ADDRESS`, `USDC_ADDRESS`, `PLATFORM_TOKEN_ADDRESS`

## Environment variables

See **`contracts/env.example`** for the full list. Commonly used:

| Variable | Used by |
|----------|---------|
| `PRIVATE_KEY` | all three |
| `BASE_RPC_URL` | all three |
| `USE_LATEST_DEPLOYMENT` | all three |
| `USDC_AMOUNT` | `depositUSDC.js` |
| `CHECK_ADDRESSES` | `checkPlatformTokenBalance.js` |
| `RECIPIENT_ADDRESS` | `emergencyWithdrawAll.js` |
| `DEPOSIT_MANAGER_ADDRESS`, `USDC_ADDRESS`, `PLATFORM_TOKEN_ADDRESS` | manual mode when `USE_LATEST_DEPLOYMENT=false` |

## Prerequisites

1. **Real USDC** on Base for `depositUSDC.js` (bridge, DEX, or CEX).
2. **`server/src/contracts/base.json`** populated (e.g. after `pnpm run deploy:contracts:base`) when using latest deployment addresses.

## Usage

Run from the **repository root** so `contracts/.env` loads correctly:

```bash
pnpm run base:deposit-usdc
node scripts/base/checkPlatformTokenBalance.js
node scripts/base/emergencyWithdrawAll.js
```

Running `npm run` from inside `scripts/` uses the wrong cwd for `contracts/.env`; use the commands above from the repo root, or point `dotenv` at an absolute path in code.

## Security

- **Mainnet real funds** — `depositUSDC.js` and `emergencyWithdrawAll.js` move real USDC; test flows on Sepolia first.
- Never commit `contracts/.env`.
- **Emergency withdraw** is destructive to normal backing assumptions; treat as break-glass only.
