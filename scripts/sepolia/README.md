# Sepolia scripts (Base Sepolia, chain 84532)

Helpers for contracts deployed by `contracts/script/Deploy_sepolia.s.sol`. Env vars live in **`contracts/.env`** (copy from `contracts/env.example`). Scripts load `path.join(process.cwd(), "contracts", ".env")`, so **run them with the repository root as the current working directory** (the `pnpm run` / `node scripts/...` examples below do that).

## Scripts

### `mintPaymentToken.js`

Mints **MockUSDC** (`paymentTokenAddress` in `server/src/contracts/sepolia.json`) to `RECIPIENT_ADDRESS`. Caller must be the token **owner** (typically the deployer). Uses `mint(address,uint256)`.

**Required env:** `PRIVATE_KEY`, `RECIPIENT_ADDRESS`

**Optional env:** `BASE_SEPOLIA_RPC_URL`, `AMOUNT` (6 decimals; default `10000000000`), `USE_LATEST_DEPLOYMENT`, `PAYMENT_TOKEN_ADDRESS` (when `USE_LATEST_DEPLOYMENT` is not used / manual mode)

### `deployContestFactory.js` / `deployReferral.js`

Redeploy ContestFactory or the referral stack only. See [referral-network.md](../../docs/platform/referral-network.md).

### `pushPayouts.js`

Oracle helpers to push primary or secondary payouts after settlement.

## Environment variables

See **`contracts/env.example`** for the full list and the quick-reference table. Commonly used here:

| Variable | Used by |
|----------|---------|
| `PRIVATE_KEY` | mint / push / deploy |
| `BASE_SEPOLIA_RPC_URL` | mint / push |
| `USE_LATEST_DEPLOYMENT` | mint |
| `RECIPIENT_ADDRESS` | `mintPaymentToken.js` |
| `AMOUNT` | `mintPaymentToken.js` |
| `PAYMENT_TOKEN_ADDRESS` | `mintPaymentToken.js` (manual mode) |

## Prerequisites

1. Deploy (or sync addresses): `pnpm run deploy:contracts:sepolia` or ensure `server/src/contracts/sepolia.json` has `paymentTokenAddress`, etc.
2. Install JS deps for `scripts/` (`ethers`, `dotenv`): from repo root, `npm install --prefix scripts` (or `cd scripts && npm install`) once.

## Usage (from repo root)

```bash
pnpm run mint-tokens
```

Or:

```bash
node scripts/sepolia/mintPaymentToken.js
```

## Notes

- Amounts: MockUSDC uses **6 decimals**.
