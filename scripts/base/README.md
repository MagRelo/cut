# Base mainnet scripts (Base, chain 8453)

Deploy and verify via the root helpers:

```bash
pnpm run deploy:contracts:base
pnpm run verify:contracts:base
```

`Deploy_base.s.sol` deploys **ContestFactory**, **ReferralGraph**, and **RewardCalculator**. Payment token is canonical Base USDC (recorded in `base.json`, not deployed).

Env vars live in **`contracts/.env`**. See [contracts/env.example](../../contracts/env.example) and the root [scripts/README.md](../README.md).

Legacy yield-token helpers (`depositUSDC`, `checkPlatformTokenBalance`, `emergencyWithdrawAll`) lived under this folder and are archived at `scripts/archive/base/` — contests escrow **USDC** directly; there is no PlatformToken / DepositManager / Aave stack in the current deploy path.
