import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Helper function to find user by wallet address
async function findUserByWallet(address: string, chainId: number) {
  const wallet = await prisma.userWallet.findUnique({
    where: {
      chainId_publicKey: {
        chainId,
        publicKey: address.toLowerCase(),
      },
    },
    include: {
      user: true,
    },
  });
  return wallet?.user;
}

export default router;
