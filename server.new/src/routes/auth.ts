import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Web3 authentication endpoint
router.post('/web3', async (req, res) => {
  try {
    const { address, signature, message, chainId = 1 } = req.body;

    // if (!address || !signature || !message) {
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // TEMPORARY: Simulate successful web3 authentication
    // In production, we would:
    // 1. Verify the signature matches the message and address
    // 2. Check if user exists, if not create them
    // 3. Generate a proper JWT token

    // Check if wallet exists
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        publicKey: address.toLowerCase(),
        chainId: Number(chainId),
      },
      include: { user: true },
    });

    let user;
    if (existingWallet) {
      user = existingWallet.user;
    } else {
      // Create new user and wallet
      user = await prisma.user.create({
        data: {
          name: `User ${address.slice(0, 6)}`,
          userType: 'PUBLIC',
          wallets: {
            create: {
              chainId: Number(chainId),
              publicKey: address.toLowerCase(),
              isPrimary: true,
            },
          },
        },
      });
    }

    // Generate a temporary JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        address: address.toLowerCase(),
        chainId: Number(chainId),
        userType: user.userType,
      },
      process.env.JWT_SECRET || 'temporary-secret-key',
      { expiresIn: '7d' }
    );

    // Return success response with user data and token
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        userType: user.userType,
        address: address.toLowerCase(),
        chainId: Number(chainId),
      },
      token,
    });
  } catch (error) {
    console.error('Error in web3 authentication:', error);
    res.status(500).json({ error: 'Failed to authenticate with web3' });
  }
});

// Get current user information
router.get('/me', requireAuth, async (req, res) => {
  try {
    // get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        manualActive: true,
      },
    });

    // Get user's data including tournament lineups and groups
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        tournamentLineups: {
          where: { tournamentId: activeTournament?.id },
          include: {
            players: {
              include: {
                tournamentPlayer: {
                  include: {
                    player: true,
                  },
                },
              },
            },
          },
        },
        userGroups: {
          include: {
            userGroup: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

export default router;
