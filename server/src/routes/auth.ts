import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";
import { mintUSDCToUser } from "../services/mintUserTokens.js";

import { hashMessage } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";

import { RelayActions, Porto } from "porto";
import { RelayClient } from "porto/viem";
const porto = Porto.create();

const authRouter = new Hono();

// SIWE Nonce endpoint (POST for Porto compatibility)
authRouter.post("/siwe/nonce", (c) => {
  // console.log("Generating SIWE nonce");
  const response = {
    nonce: generateSiweNonce(),
  };
  return c.json(response);
});

// SIWE authentication endpoint
authRouter.post("/siwe/verify", async (c) => {
  try {
    // Handle different body formats
    let message, signature;

    const body = await c.req.json().catch(() => null);

    if (body && typeof body === "object") {
      // Standard JSON body
      ({ message, signature } = body);
    } else {
      // Try to parse as plain text
      const textBody = await c.req.text().catch(() => null);
      if (textBody) {
        try {
          const parsed = JSON.parse(textBody);
          ({ message, signature } = parsed);
        } catch (e) {
          console.error("Failed to parse plain text body as JSON:", e);
          return c.json({ error: "Invalid request body format" }, 400);
        }
      } else {
        return c.json({ error: "Invalid request body" }, 400);
      }
    }

    if (!message || !signature) {
      return c.json({ error: "Message and signature are required" }, 400);
    }

    const { address, chainId } = parseSiweMessage(message);

    // Verify the signature.
    const client = RelayClient.fromPorto(porto, { chainId });
    const valid = await RelayActions.verifySignature(client, {
      address: address!,
      digest: hashMessage(message),
      signature,
    });

    // If the signature is invalid, we cannot authenticate the user
    if (!valid) {
      return c.json({ error: "Invalid signature" }, 401);
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

      // Check if token minting is enabled
      const isTokenMintingEnabled = process.env.ENABLE_TOKEN_MINTING === "true";
      if (isTokenMintingEnabled) {
        // Mint $1000 USDC(x) to new user
        try {
          await mintUSDCToUser(address!.toLowerCase(), 1000);
          console.log(`Minted $1000 USDC(x) to new user: ${address!.toLowerCase()}`);
        } catch (mintError) {
          console.error("Failed to mint and transfer tokens to new user:", mintError);
          // Don't fail the user creation if token minting fails
        }
      } else {
        console.log("Token minting is disabled. Skipping token transfer to new user.");
      }
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

    setCookie(c, "auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    // Return success response
    return c.json({
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
    return c.json({ error: "Failed to authenticate with SIWE" }, 500);
  }
});

// SIWE Logout endpoint
authRouter.post("/siwe/logout", async (c) => {
  try {
    // For JWT-based auth, we don't need to do anything server-side
    // The client should remove the token from localStorage
    // But we can log the logout for audit purposes
    // console.log(`User ${req.user!.userId} logged out via SIWE`);

    return c.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during SIWE logout:", error);
    return c.json({ error: "Failed to logout" }, 500);
  }
});

// Get current user information
authRouter.get("/me", requireAuth, async (c) => {
  try {
    const user = c.get("user");

    // get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        manualActive: true,
      },
    });

    // Get user's data including tournament lineups and groups
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
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

    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }

    // filter out user info that is not needed
    const { tournamentLineups, userGroups, ...userInfo } = userData;
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
      id: userInfo.id,
      name: userInfo.name,
      userType: userInfo.userType,
      settings: userInfo.settings,
      phone: userInfo.phone,
      email: userInfo.email,
      isVerified: userInfo.isVerified,
      tournamentLineups: formattedLineups,
      userGroups,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user information" }, 500);
  }
});

// Update user route
authRouter.put("/update", requireAuth, async (c) => {
  try {
    const { name } = await c.req.json();
    const user = c.get("user");

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: { name },
    });

    return c.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        userType: updatedUser.userType,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user information" }, 500);
  }
});

// Update settings route
authRouter.put("/settings", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const settings = await c.req.json();

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        settings,
      },
    });

    return c.json({
      success: true,
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: "Failed to update user settings" }, 500);
  }
});

export default authRouter;
