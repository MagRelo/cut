import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";

import { createClient, http, hashMessage } from "viem";
import { Chains } from "porto";
import { Key, ServerActions } from "porto/viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
// Instantiate a Viem Client with Porto-compatible Chain.
const client = createClient({
  chain: Chains.baseSepolia,
  transport: http(),
});

const router = Router();

// SIWE Nonce endpoint
router.get("/siwe/nonce", (req, res) => {
  console.log("Generating SIWE nonce");
  const response = {
    nonce: generateSiweNonce(),
  };
  res.send(response);
});

// SIWE authentication endpoint
router.post("/siwe", async (req, res) => {
  try {
    // Handle different body formats
    let message, signature;

    if (req.body && typeof req.body === "object") {
      // Standard JSON body
      ({ message, signature } = req.body);
    } else if (typeof req.body === "string") {
      // Plain text body - try to parse as JSON
      try {
        const parsed = JSON.parse(req.body);
        ({ message, signature } = parsed);
      } catch (e) {
        console.error("Failed to parse plain text body as JSON:", e);
        return res.status(400).json({ error: "Invalid request body format" });
      }
    } else {
      return res.status(400).json({ error: "Invalid request body" });
    }

    if (!message || !signature) {
      return res.status(400).json({ error: "Message and signature are required" });
    }

    const { address, chainId, nonce } = parseSiweMessage(message);

    // Verify the signature
    const valid = await ServerActions.verifySignature(client, {
      address: address!,
      digest: hashMessage(message),
      signature,
    });

    // If the signature is invalid, we cannot authenticate the user
    if (!valid.valid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Check if wallet exists
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        publicKey: address!.toLowerCase(),
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
          name: `User ${address!.slice(0, 6)}`,
          userType: "PUBLIC",
          wallets: {
            create: {
              chainId: Number(chainId),
              publicKey: address!.toLowerCase(),
              isPrimary: true,
            },
          },
        },
      });
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        address: address!.toLowerCase(),
        chainId: Number(chainId),
        userType: user.userType,
      },
      process.env.JWT_SECRET || "temporary-secret-key",
      { expiresIn: "7d" }
    );

    res.cookie("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return success response
    res.json({
      success: true,
      message: "Authenticated",
      user: {
        id: user.id,
        name: user.name,
        userType: user.userType,
        address: address!.toLowerCase(),
        chainId: Number(chainId),
      },
      token,
    });
  } catch (error) {
    console.error("Error in SIWE authentication:", error);
    res.status(500).json({ error: "Failed to authenticate with SIWE" });
  }
});

// SIWE Logout endpoint
router.post("/siwe/logout", async (req, res) => {
  try {
    // For JWT-based auth, we don't need to do anything server-side
    // The client should remove the token from localStorage
    // But we can log the logout for audit purposes
    // console.log(`User ${req.user!.userId} logged out via SIWE`);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during SIWE logout:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// Get nonce
router.get("/nonce", async (req, res) => {
  try {
    // Generate a random nonce for wallet authentication
    // nonce must be at least 8 characters.
    // nonce must be alphanumeric.
    const nonce = Math.random().toString(36).substring(2, 15);
    console.log({ nonce });
    res.send(nonce);
  } catch (error) {
    console.error("Error generating nonce:", error);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

// Web3 authentication endpoint
router.post("/web3", async (req, res) => {
  try {
    const { address, signature, message, chainId = 1 } = req.body;

    // if (!address || !signature || !message) {
    if (!address || !signature || !message) {
      return res.status(400).json({ error: "Address, signature, and message are required" });
    }
    const digest = hashMessage(message);

    // Extract address from SIWE message
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    const messageAddress = addressMatch ? addressMatch[0] : address;

    // console.log("=== SIWE Authentication Debug ===");
    // console.log("Sent address:", address);
    // console.log("Message address:", messageAddress);
    // console.log("Addresses match:", messageAddress.toLowerCase() === address.toLowerCase());
    // console.log("ChainId:", chainId);
    // console.log("Message length:", message.length);
    // console.log("Full message:", message); // Log the entire message
    // console.log("Signature length:", signature.length);
    // console.log("Signature:", signature);
    // console.log("Digest:", digest);
    // console.log("Signature type check:");
    // console.log("- Length:", signature.length);
    // console.log("- Length in bytes:", Math.floor(signature.length / 2));
    // console.log("- Is hex:", /^0x[a-fA-F0-9]+$/.test(signature));
    // console.log("- Standard ETH sig length (65 bytes):", signature.length === 130); // 65 bytes = 130 hex chars

    const isValid = await ServerActions.verifySignature(client, {
      address: messageAddress,
      digest: digest,
      signature: signature,
    });

    if (!isValid.valid) {
      console.log({ isValid });
      return res.status(400).json({ error: "Invalid signature" });
    }

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
          userType: "PUBLIC",
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
      process.env.JWT_SECRET || "temporary-secret-key",
      { expiresIn: "7d" }
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
    console.error("Error in web3 authentication:", error);
    res.status(500).json({ error: "Failed to authenticate with web3" });
  }
});

// Get current user information
router.get("/me", requireAuth, async (req, res) => {
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
      return res.status(404).json({ error: "User not found" });
    }

    // filter out user info that is not needed
    const { tournamentLineups, userGroups, ...userData } = user;
    // Format tournamentLineups to match TournamentLineup type
    const formattedLineups = tournamentLineups.map((lineup) => ({
      id: lineup.id,
      players: lineup.players.map((lineupPlayer) => ({
        ...lineupPlayer.tournamentPlayer.player,
        tournamentId: lineup.tournamentId,
        tournamentData: {
          leaderboardPosition: lineupPlayer.tournamentPlayer.leaderboardPosition,
          r1: lineupPlayer.tournamentPlayer.r1,
          r2: lineupPlayer.tournamentPlayer.r2,
          r3: lineupPlayer.tournamentPlayer.r3,
          r4: lineupPlayer.tournamentPlayer.r4,
          cut: lineupPlayer.tournamentPlayer.cut,
          bonus: lineupPlayer.tournamentPlayer.bonus,
          total: lineupPlayer.tournamentPlayer.total,
          leaderboardTotal: lineupPlayer.tournamentPlayer.leaderboardTotal,
        },
      })),
    }));
    const response = {
      id: userData.id,
      name: userData.name,
      userType: userData.userType,
      settings: userData.settings,
      phone: userData.phone,
      email: userData.email,
      isVerified: userData.isVerified,
      tournamentLineups: formattedLineups,
      userGroups,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user information" });
  }
});

// Update user route
router.put("/update", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user!.userId;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        userType: updatedUser.userType,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user information" });
  }
});

// Update settings route
router.put("/settings", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const settings = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        settings,
      },
    });

    res.json({
      success: true,
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  try {
    // For JWT-based auth, we don't need to do anything server-side
    // The client should remove the token from localStorage
    // But we can log the logout for audit purposes
    console.log(`User ${req.user!.userId} logged out`);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;
