import { Prisma } from "@prisma/client";
import type { Address } from "viem";
import { prisma } from "../../lib/prisma.js";

/**
 * ERC-8128 replay protection for bot API writes.
 *
 * `BotActionLog` is the nonce record. A write inserts its (signer, nonce) row BEFORE it
 * does anything else, so a replayed or concurrent duplicate request fails on the unique
 * index and never executes. The row is then completed with the user and the outcome.
 * Reads never touch this table.
 */
export type BotNonceStore = {
  reserve: (input: {
    signerAddress: Address;
    nonce: string;
    action: string;
  }) => Promise<{ ok: true; id: string } | { ok: false }>;
  finish: (
    id: string,
    outcome: { userId: string | null; action: string; error?: string | undefined },
  ) => Promise<void>;
};

export function createBotNonceStore(): BotNonceStore {
  return {
    reserve: async ({ signerAddress, nonce, action }) => {
      try {
        const row = await prisma.botActionLog.create({
          data: { signerAddress: signerAddress.toLowerCase(), nonce, action },
          select: { id: true },
        });
        return { ok: true, id: row.id };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { ok: false };
        }
        throw error;
      }
    },
    finish: async (id, { userId, action, error }) => {
      try {
        await prisma.botActionLog.update({
          where: { id },
          data: { userId, action, error: error ?? null },
        });
      } catch (err) {
        console.error("bot nonce finish:", err);
      }
    },
  };
}
