/**
 * Backfill / repair `UserWallet` rows from Privy linked accounts (EOA + smart wallet on Base/Base Sepolia).
 * Safe to re-run: skips addresses already owned by another user.
 *
 * Run:
 *   pnpm --filter server exec tsx src/scripts/syncUserWalletsFromPrivy.ts
 * Optional:
 *   LIMIT=10 — only process first N users (ordered by id)
 *   PREFERRED_CHAIN_ID=84532 — forwarded to wallet resolution (EOA default chain when ambiguous)
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { getPrivyClient } from "../lib/privyClient.js";
import { syncUserWalletsForPrivyUser } from "../lib/privyUserProvisioning.js";

async function main() {
  const limitRaw = process.env.LIMIT;
  const limit = limitRaw != null && limitRaw !== "" ? parseInt(limitRaw, 10) : undefined;
  if (limit != null && (!Number.isFinite(limit) || limit < 1)) {
    console.error("INVALID: LIMIT must be a positive integer");
    process.exit(1);
  }

  const preferredChainIdRaw = process.env.PREFERRED_CHAIN_ID;
  const preferredChainId =
    preferredChainIdRaw != null && preferredChainIdRaw !== ""
      ? parseInt(preferredChainIdRaw, 10)
      : undefined;
  if (
    preferredChainId != null &&
    (!Number.isFinite(preferredChainId) || ![8453, 84532].includes(preferredChainId))
  ) {
    console.error("INVALID: PREFERRED_CHAIN_ID must be 8453 or 84532");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { privyUserId: { not: null } },
    select: { id: true, privyUserId: true },
    orderBy: { id: "asc" },
    ...(limit != null ? { take: limit } : {}),
  });

  const privy = getPrivyClient();
  let ok = 0;
  let fail = 0;

  for (const u of users) {
    const pid = u.privyUserId!;
    try {
      const pu = await privy.users()._get(pid);
      await syncUserWalletsForPrivyUser(u.id, pu, preferredChainId);
      ok += 1;
      console.log(`ok  user=${u.id} privy=${pid}`);
    } catch (e) {
      fail += 1;
      console.error(`err user=${u.id} privy=${pid}`, e);
    }
  }

  console.log(JSON.stringify({ processed: users.length, ok, fail }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
