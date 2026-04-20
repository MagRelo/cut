# Sepolia scripts (Base Sepolia, chain 84532)

Helpers for contracts deployed by `contracts/script/Deploy_sepolia.s.sol`. Env vars live in **`contracts/.env`** (copy from `contracts/env.example`). Scripts load `path.join(process.cwd(), "contracts", ".env")`, so **run them with the repository root as the current working directory** (the `pnpm run` / `node scripts/...` examples below do that).

## Scripts

### `mintPaymentToken.js`

Mints **MockUSDC** (`paymentTokenAddress` in `server/src/contracts/sepolia.json`) to `RECIPIENT_ADDRESS`. Caller must be the token **owner** (typically the deployer). Uses `mint(address,uint256)`.

**Required env:** `PRIVATE_KEY`, `RECIPIENT_ADDRESS`

**Optional env:** `BASE_SEPOLIA_RPC_URL`, `AMOUNT` (6 decimals; default `10000000000`), `USE_LATEST_DEPLOYMENT`, `PAYMENT_TOKEN_ADDRESS` (when `USE_LATEST_DEPLOYMENT` is not used / manual mode)

### `depositUSDC.js`

Approves and deposits **MockUSDC** into **DepositManager** and receives **PlatformToken (xCUT)**. If balance is low and the wallet owns MockUSDC, the script can mint more mock USDC first.

**Required env:** `PRIVATE_KEY`

**Optional env:** `BASE_SEPOLIA_RPC_URL`, `USDC_AMOUNT` (6 decimals; default `1000000` = 1 USDC), `USE_LATEST_DEPLOYMENT`, `DEPOSIT_MANAGER_ADDRESS`, `PAYMENT_TOKEN_ADDRESS`, `PLATFORM_TOKEN_ADDRESS` (manual addresses when not using latest deployment)

### `claimOracleFee.js`

Calls **`ContestController.claimOracleFee()`** on a deployed contest. **Only the on-chain `oracle` address** can execute; `PRIVATE_KEY` must match that wallet. Transfers **`accumulatedOracleFee`** (from payout fees) to the oracle. If `accumulatedOracleFee` is zero, the script exits without sending a tx.

**Required env:** `PRIVATE_KEY` (oracle key)

**Optional env:** `CONTEST_CONTROLLER_ADDRESS` (if you omit the CLI argument), `BASE_SEPOLIA_RPC_URL`

**Usage (contest address as first argument):**

```bash
pnpm run claim-oracle-fee -- 0xYourContestControllerAddress
```

Or:

```bash
node scripts/sepolia/claimOracleFee.js 0xYourContestControllerAddress
```

## Environment variables

See **`contracts/env.example`** for the full list and the quick-reference table. Commonly used here:

| Variable | Used by |
|----------|---------|
| `PRIVATE_KEY` | both |
| `BASE_SEPOLIA_RPC_URL` | both |
| `USE_LATEST_DEPLOYMENT` | both |
| `RECIPIENT_ADDRESS` | `mintPaymentToken.js` |
| `AMOUNT` | `mintPaymentToken.js` |
| `USDC_AMOUNT` | `depositUSDC.js` |
| `DEPOSIT_MANAGER_ADDRESS`, `PAYMENT_TOKEN_ADDRESS`, `PLATFORM_TOKEN_ADDRESS` | `depositUSDC.js` (manual mode) |
| `CONTEST_CONTROLLER_ADDRESS` | `claimOracleFee.js` (optional if you pass address on CLI) |

## Prerequisites

1. Deploy (or sync addresses): `pnpm run deploy:contracts:sepolia` or ensure `server/src/contracts/sepolia.json` has `paymentTokenAddress`, `depositManagerAddress`, `platformTokenAddress`, etc.
2. Install JS deps for `scripts/` (`ethers`, `dotenv`): from repo root, `npm install --prefix scripts` (or `cd scripts && npm install`) once.

## Usage (from repo root)

```bash
pnpm run mint-tokens
pnpm run deposit-usdc
pnpm run claim-oracle-fee -- 0x<contestControllerAddress>
```

Or:

```bash
node scripts/sepolia/mintPaymentToken.js
node scripts/sepolia/depositUSDC.js
node scripts/sepolia/claimOracleFee.js 0x<contestControllerAddress>
```

## Notes

- Amounts: MockUSDC uses **6 decimals**; PlatformToken (xCUT) uses **18 decimals** where shown in logs.
- `depositUSDC.js` approves the DepositManager spender as needed before depositing.
