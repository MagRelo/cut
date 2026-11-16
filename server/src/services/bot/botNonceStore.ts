import { Prisma } from "@prisma/client";
import { createUniqueInsertNonceStore, type NonceStore } from "@slicekit/erc8128";
import { prisma } from "../../lib/prisma.js";

export function createBotNonceStore(): NonceStore {
  return createUniqueInsertNonceStore({
    insertUnique: async (key, expiresAt) => {
      await prisma.botRequestNonce.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      try {
        await prisma.botRequestNonce.create({ data: { key, expiresAt } });
        return true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return false;
        }
        throw error;
      }
    },
  });
}
