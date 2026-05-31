import { randomBytes } from "node:crypto";

import { prisma } from "../lib/prisma.js";

/** Avoid ambiguous characters (0/O, 1/l/I) for shareable codes. */
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
}

export async function generateUniqueInviteCode(length = 8): Promise<string> {
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
