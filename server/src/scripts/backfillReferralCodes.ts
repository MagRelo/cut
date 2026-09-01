/**
 * Assign opaque referral codes to users that do not have one.
 *
 * Run: pnpm --filter server run script:backfill-referral-codes
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { ensureUserReferralCode } from "../lib/referralCode.js";

async function main() {
  const users = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  console.log(`Users missing referralCode: ${users.length}`);

  let assigned = 0;
  for (const user of users) {
    await ensureUserReferralCode(user.id);
    assigned++;
    if (assigned % 50 === 0) {
      console.log(`Assigned ${assigned}/${users.length}`);
    }
  }
  console.log(`Assigned referral codes: ${assigned}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
