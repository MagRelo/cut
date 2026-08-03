/**
 * Register cold emergency-recovery address under REFERRAL_ROOT on ReferralGraph.
 *
 *   pnpm --filter server run script:bootstrap-referral-root
 *   pnpm --filter server run script:bootstrap-referral-root --dry-run
 */

import "dotenv/config";
import { getReferralSyncChainIdFromEnv } from "../lib/referralConfig.js";
import {
  bootstrapReferralRoot,
  isReferralRootRegistered,
  resolveReferralGraphSetup,
} from "../services/referral/referralGraphSetup.js";

function hasDryRunFlag(): boolean {
  return process.argv.includes("--dry-run");
}

async function main() {
  const chainId = getReferralSyncChainIdFromEnv();
  const dryRun = hasDryRunFlag();
  const setup = resolveReferralGraphSetup(chainId);

  const already = await isReferralRootRegistered(setup);
  if (already) {
    console.log(
      JSON.stringify(
        {
          chainId,
          referralRoot: setup.referralRoot,
          graphAddress: setup.graphAddress,
          status: "already_registered",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await bootstrapReferralRoot(setup, { dryRun });
  console.log(
    JSON.stringify(
      {
        chainId,
        dryRun,
        referralRoot: setup.referralRoot,
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
