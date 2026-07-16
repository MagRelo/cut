# Sepolia scripts (Base Sepolia, chain 84532)

Helpers for contracts deployed by `contracts/script/Deploy_sepolia.s.sol`. Env vars live in **`contracts/.env`** (copy from `contracts/env.example`). Scripts load `path.join(process.cwd(), "contracts", ".env")`, so **run them with the repository root as the current working directory**.

## Scripts

### `mintPaymentToken.js`

Mints **MockUSDC** (`paymentTokenAddress` in `server/src/contracts/sepolia.json`) to `RECIPIENT_ADDRESS`. Caller must be the token **owner** (typically the deployer). Uses `mint(address,uint256)`.

**Required env:** `PRIVATE_KEY`, `RECIPIENT_ADDRESS`

**Optional env:** `BASE_SEPOLIA_RPC_URL`, `AMOUNT` (6 decimals; default `10000000000`), `USE_LATEST_DEPLOYMENT`, `PAYMENT_TOKEN_ADDRESS` (manual mode)

### `deployReferral.js` / `deployContestFactory.js`

Partial redeploys — see root [scripts/README.md](../README.md).

### `pushPayouts.js`

Oracle push of primary or secondary payouts after settlement.

## Prerequisites

1. Deploy (or sync addresses): `pnpm run deploy:contracts:sepolia` or ensure `server/src/contracts/sepolia.json` has `paymentTokenAddress`, `contestFactoryAddress`, `referralGraphAddress`, `rewardCalculatorAddress`.
2. Install JS deps for `scripts/` (`ethers`, `dotenv`): from repo root, `npm install --prefix scripts` once.

## Usage (from repo root)

```bash
pnpm run mint-tokens
pnpm run sepolia:deploy-referral
pnpm run sepolia:deploy-contest-factory
pnpm run push-primary-payouts
pnpm run push-secondary-payouts
```

## Notes

- MockUSDC uses **6 decimals**.
- Contests use MockUSDC as the payment token directly (no PlatformToken / DepositManager).
- Referral network fees are paid during `settleContest` (no separate oracle fee claim).
