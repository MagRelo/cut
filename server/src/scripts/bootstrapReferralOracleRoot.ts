/**
 * Register contest oracle under REFERRAL_ROOT on ReferralGraph (Option B step 1).
 *
 *   pnpm --filter server run script:bootstrap-referral-oracle-root
 *   pnpm --filter server run script:bootstrap-referral-oracle-root -- --dry-run
 */

import "dotenv/config";
import { getReferralSyncChainIdFromEnv } from "../lib/referralConfig.js";
import {
  bootstrapReferralOracleRoot,
  isOracleRootRegistered,
  resolveReferralGraphSetup,
} from "../services/referral/referralGraphSetup.js";

function hasDryRunFlag(): boolean {
  return process.argv.includes("--dry-run");
}

async function main() {
  const chainId = getReferralSyncChainIdFromEnv();
  const dryRun = hasDryRunFlag();
  const setup = resolveReferralGraphSetup(chainId);

  const already = await isOracleRootRegistered(setup);
  if (already) {
    console.log(
      JSON.stringify(
        {
          chainId,
          oracleRoot: setup.oracleRoot,
          graphAddress: setup.graphAddress,
          status: "already_registered",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await bootstrapReferralOracleRoot(setup, { dryRun });
  console.log(
    JSON.stringify(
      {
        chainId,
        dryRun,
        oracleRoot: setup.oracleRoot,
        graphAddress: setup.graphAddress,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
