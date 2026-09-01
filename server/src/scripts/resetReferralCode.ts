/**
 * Replace a user's opaque referral code. Already-shared `?ref=` links with the
 * old code stop attaching; copy a fresh invite URL from Account / league admin.
 *
 * Run: pnpm --filter server run script:reset-referral-code <userId|email|wallet>
 */

import "dotenv/config";
import { isAddress } from "viem";
import { prisma } from "../lib/prisma.js";
import { generateUniqueReferralCode } from "../utils/inviteCode.js";

async function findUser(ident: string) {
  const byId = await prisma.user.findUnique({
    where: { id: ident },
    select: { id: true, email: true, referralCode: true },
  });
  if (byId) return byId;

  const email = ident.trim().toLowerCase();
  if (email.includes("@")) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, referralCode: true },
    });
    if (byEmail) return byEmail;
  }

  if (isAddress(ident)) {
    const wallet = await prisma.userWallet.findFirst({
      where: { publicKey: { equals: ident.toLowerCase(), mode: "insensitive" } },
      select: {
        user: { select: { id: true, email: true, referralCode: true } },
      },
    });
    if (wallet) return wallet.user;
  }

  return null;
}

async function main() {
  const ident = process.argv[2]?.trim();
  if (!ident) {
    console.error("Usage: pnpm --filter server run script:reset-referral-code <userId|email|wallet>");
    process.exit(1);
  }

  const user = await findUser(ident);
  if (!user) {
    console.error(`No user found for ${ident}`);
    process.exit(1);
  }

  const referralCode = await generateUniqueReferralCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { referralCode },
  });

  console.log(`userId: ${user.id}`);
  if (user.email) console.log(`email: ${user.email}`);
  console.log(`old: ${user.referralCode ?? "(none)"}`);
  console.log(`new: ${referralCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
