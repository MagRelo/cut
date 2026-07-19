/**
 * Rematerialize ReferralGraph from DB (Sepolia or Base via REFERRAL_SYNC_CHAIN_ID).
 *
 *   pnpm --filter server run script:rematerialize-referral-graph --dry-run
 *   pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
 *   pnpm --filter server run script:rematerialize-referral-graph --dry-run --reset-hashes
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { rematerializeReferralGraph } from "../services/referral/rematerializeReferralGraph.js";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(name);
}

async function main() {
  const dryRun = hasFlag("dry-run");
  const resetHashes = hasFlag("reset-hashes");

  const result = await rematerializeReferralGraph({ dryRun, resetHashes });
  console.log(JSON.stringify(result, null, 2));

  const hardFail =
    result.failed.length > 0 ||
    (!dryRun && result.auditMismatches.length > 0) ||
    (!dryRun && result.deferred.length > 0);

  if (hardFail) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
