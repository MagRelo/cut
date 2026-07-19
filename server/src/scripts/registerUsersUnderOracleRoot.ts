/**
 * Register organic users under the oracle root (no invite fields).
 * Prefer `script:rematerialize-referral-graph` for a full DB→chain rebuild.
 *
 *   pnpm --filter server run script:register-users-under-oracle-root
 *   pnpm --filter server run script:register-users-under-oracle-root --dry-run
 */

import "dotenv/config";
import { getAddress } from "viem";
import { prisma } from "../lib/prisma.js";
import { getReferralSyncChainIdFromEnv } from "../lib/referralConfig.js";
import {
  bootstrapReferralOracleRoot,
  isOracleRootRegistered,
  isWalletRegisteredOnGraph,
  registerWalletOnReferralGraph,
  resolveReferralGraphSetup,
} from "../services/referral/referralGraphSetup.js";
import { referralGraphGetReferrer } from "../services/referral/referralGraph.js";
import { pickWalletPublicKeyForChain } from "../utils/pickWalletForChain.js";

const ALREADY_ON_CHAIN = "already_registered";

function hasDryRunFlag(): boolean {
  return process.argv.includes("--dry-run") || process.argv.includes("dry-run");
}

async function main() {
  const chainId = getReferralSyncChainIdFromEnv();
  const dryRun = hasDryRunFlag();
  const setup = resolveReferralGraphSetup(chainId);

  if (!(await isOracleRootRegistered(setup))) {
    const boot = await bootstrapReferralOracleRoot(setup, { dryRun });
    if (!dryRun && !boot.registered && boot.txHash == null) {
      throw new Error("Oracle root is not registered; run bootstrap first");
    }
    if (dryRun) {
      console.log("[dry-run] would bootstrap oracle root under REFERRAL_ROOT");
    }
  }

  const users = await prisma.user.findMany({
    where: {
      referrerAddress: null,
      referredByUserId: null,
      wallets: { some: { chainId } },
    },
    include: { wallets: true },
  });

  let registered = 0;
  let skippedAlready = 0;
  let failed = 0;

  for (const u of users) {
    const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
    if (!wallet) continue;

    if (wallet.toLowerCase() === setup.oracleRoot.toLowerCase()) {
      skippedAlready += 1;
      continue;
    }

    try {
      if (await isWalletRegisteredOnGraph(setup, wallet)) {
        const parent = await referralGraphGetReferrer(
          setup.chainId,
          setup.graphAddress,
          getAddress(wallet).toLowerCase() as `0x${string}`,
          setup.groupId,
        );
        if (parent !== setup.oracleRoot.toLowerCase()) {
          failed += 1;
          console.error(
            `failed user=${u.id}: already registered under ${parent}, expected oracle`,
          );
          continue;
        }
        if (!dryRun && !u.referralOnchainTxHash) {
          await prisma.user.update({
            where: { id: u.id },
            data: {
              referralOnchainTxHash: ALREADY_ON_CHAIN,
              referralGroupId: setup.groupId,
              referralChainId: chainId,
            },
          });
        }
        skippedAlready += 1;
        continue;
      }

      const { txHash, skipped } = await registerWalletOnReferralGraph(
        setup,
        wallet,
        setup.oracleRoot,
        { dryRun },
      );

      if (skipped) {
        skippedAlready += 1;
        continue;
      }

      if (!dryRun && txHash) {
        await prisma.user.update({
          where: { id: u.id },
          data: {
            referralOnchainTxHash: txHash,
            referralGroupId: setup.groupId,
            referralChainId: chainId,
          },
        });
      }

      registered += 1;
      console.log(`${dryRun ? "[dry-run] would register" : "registered"} user=${u.id} wallet=${wallet}`);
    } catch (e) {
      failed += 1;
      console.error(`failed user=${u.id}`, e);
    }
  }

  console.log(
    JSON.stringify(
      {
        chainId,
        dryRun,
        oracleRoot: setup.oracleRoot,
        candidates: users.length,
        registered,
        skippedAlready,
        failed,
      },
      null,
      2,
    ),
  );

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
