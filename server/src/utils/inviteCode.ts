import { randomBytes } from "node:crypto";

import { prisma } from "../lib/prisma.js";

/** Avoid ambiguous characters (0/O, 1/l/I) for shareable codes. */
export const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export const REFERRAL_CODE_LENGTH = 8;

export function generateInviteCode(length = REFERRAL_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
}

export function isValidReferralCode(code: string): boolean {
  if (code.length !== REFERRAL_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!INVITE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

export async function generateUniqueInviteCode(length = REFERRAL_CODE_LENGTH): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const inviteCode = generateInviteCode(length);
    const existing = await prisma.userGroup.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!existing) {
      return inviteCode;
    }
  }
  throw new Error("Failed to generate unique invite code");
}

export async function generateUniqueReferralCode(
  length = REFERRAL_CODE_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const referralCode = generateInviteCode(length);
    const existing = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!existing) {
      return referralCode;
    }
  }
  throw new Error("Failed to generate unique referral code");
}
