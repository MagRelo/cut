import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { sendSMS } from '../lib/sms.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  Prisma,
  User,
  Team,
  League,
  LeagueTeam,
  TeamPlayer,
  Player,
} from '@prisma/client';
import { AuthUser } from '../middleware/auth.js';

type TeamWithLeague = Team & {
  leagueTeams: (LeagueTeam & {
    league: Pick<League, 'id' | 'name'>;
  })[];
  TeamPlayer: (TeamPlayer & {
    Player: Player;
  })[];
};

const router = express.Router();

// Validation schemas
const contactSchema = z.object({
  contact: z.string().refine(
    (val) => {
      // Check if it's a valid email or phone number
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
});

const verifySchema = z.object({
  contact: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
  code: z.string().length(6),
  name: z.string().min(2).optional(),
  anonymousGuid: z
    .string()
    .refine(
      (val) => {
        // Check if it's a valid UUID or CUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const cuidRegex = /^c[a-z0-9]{24}$/i;
        return uuidRegex.test(val) || cuidRegex.test(val);
      },
      { message: 'Invalid user ID format' }
    )
    .optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
});

// Update the userInclude type
const userInclude = {
  teams: {
    include: {
      leagueTeams: {
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      TeamPlayer: {
        include: {
          Player: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

// Request verification code
router.post('/request-verification', async (req, res) => {
  try {
    const { contact } = contactSchema.parse(req.body);

    // Find user again without the expiration check
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: contact }, { phone: contact }],
      },
    });

    // Check login attempts
    if (user) {
      const lastAttempt = user.lastLoginAt || new Date(0);
      const hoursSinceLastAttempt =
        (new Date().getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

      // If within 24 hours and already at 3 attempts
      if (hoursSinceLastAttempt < 24 && (user.loginAttempts ?? 0) >= 3) {
        return res.status(429).json({
          error:
            'Maximum verification code requests reached. Please try again later.',
        });
      }

      // If more than 24 hours have passed, reset the counter
      if (hoursSinceLastAttempt >= 24) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lastLoginAt: new Date(),
          },
        });
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    if (user) {
      // console.log('updating user', user.loginAttempts);
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode,
          verificationCodeExpiresAt: expiresAt,
          loginAttempts: {
            increment: 1,
          },
          lastLoginAt: new Date(),
        },
      });
    } else {
      console.log('creating user');
      // Create new user
      await prisma.user.create({
        data: {
          email: contact.includes('@') ? contact : null,
          phone: !contact.includes('@') ? contact : null,
          name: 'User', // Will be updated during registration
          verificationCode,
          verificationCodeExpiresAt: expiresAt,
          loginAttempts: 1,
          lastLoginAt: new Date(),
        },
      });
    }

    // Send verification code
    if (contact.includes('@')) {
      await sendEmail({
        to: contact,
        subject: 'Your Verification Code',
        html: `
          <h1>Your Verification Code</h1>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 60 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
        `,
      });
      console.log(
        `Email verification code for ${contact}: ${verificationCode}`
      );
    } else {
      await sendSMS({
        to: contact,
        body: `Your verification code is: ${verificationCode}. This code will expire in 60 minutes.`,
      });
      console.log(`SMS verification code for ${contact}: ${verificationCode}`);
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Request verification error:', error);
    res.status(500).json({ error: 'Failed to request verification' });
  }
});

// Verify and login/register
router.post('/verify', async (req, res) => {
  try {
    const { contact, code, name, anonymousGuid } = verifySchema.parse(req.body);

    //
    // 1) Validate Code
    //

    // Find user by contact
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: contact }, { phone: contact }],
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if code is valid and not expired
    if (
      user.verificationCode !== code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification code' });
    }

    // Reset login attempts on successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAt: null,
        name,
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });

    //
    // 2) Transfer All associated data to new user
    //

    // Transfer teams from anonymous user if anonymousGuid is provided
    if (anonymousGuid) {
      // Find all teams owned by the anonymous user
      const anonymousTeams = await prisma.team.findMany({
        where: { userId: anonymousGuid },
        include: {
          leagueTeams: true,
        },
      });

      // Check if the new user already has a team
      const existingTeam = await prisma.team.findUnique({
        where: { userId: user.id },
      });

      // Only transfer teams if user has no existing team
      if (!existingTeam && anonymousTeams.length > 0) {
        // Transfer the first anonymous team
        await prisma.team.update({
          where: { id: anonymousTeams[0].id },
          data: { userId: user.id },
        });

        // Delete any remaining anonymous teams
        for (let i = 1; i < anonymousTeams.length; i++) {
          await prisma.team.delete({
            where: { id: anonymousTeams[i].id },
          });
        }

        // Transfer league commissioner role if anonymous user is a commissioner
        const leagues = await prisma.league.findMany({
          where: { commissionerId: anonymousGuid },
        });

        // Update commissioner for each league
        for (const league of leagues) {
          await prisma.league.update({
            where: { id: league.id },
            data: { commissionerId: user.id },
          });
        }

        // Transfer league memberships
        const memberships = await prisma.leagueMembership.findMany({
          where: { userId: anonymousGuid },
        });

        // Update memberships to new user
        for (const membership of memberships) {
          await prisma.leagueMembership.update({
            where: { id: membership.id },
            data: { userId: user.id },
          });
        }

        // Transfer order logs
        const orderLogs = await prisma.userOrderLog.findMany({
          where: { userId: anonymousGuid },
        });

        // Update order logs to new user
        for (const orderLog of orderLogs) {
          await prisma.userOrderLog.update({
            where: { id: orderLog.id },
            data: { userId: user.id },
          });
        }

        // Transfer timeline entries to the new user's team
        if (anonymousTeams.length > 0) {
          await prisma.timelineEntry.updateMany({
            where: {
              teamId: {
                in: anonymousTeams.map((team) => team.id),
              },
            },
            data: {
              teamId: anonymousTeams[0].id, // Use the first team that was transferred
            },
          });
        }

        // delete the anonymous user
        await prisma.user.delete({
          where: { id: anonymousGuid },
        });
      }
    }

    //
    // 3) Generate JWT Token
    //

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '180d' }
    );

    // Get user with teams
    const userWithTeams = await prisma.user.findUnique({
      where: { id: user.id },
      include: userInclude,
    });

    let teams: any[] = [];
    if (userWithTeams?.teams) {
      const team = userWithTeams.teams as unknown as TeamWithLeague;
      teams = team.leagueTeams.map((lt) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        leagueId: lt.league.id,
        leagueName: lt.league.name,
        players: team.TeamPlayer.map((tp) => ({
          id: tp.id,
          teamId: tp.teamId,
          playerId: tp.playerId,
          active: tp.active,
          player: tp.Player,
        })),
      }));
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      token,
      teams,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Get current user route
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: userInclude,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let teams: any[] = [];
    if (user.teams) {
      const team = user.teams as unknown as TeamWithLeague;
      teams = team.leagueTeams.map((lt) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        leagueId: lt.league.id,
        leagueName: lt.league.name,
        players: team.TeamPlayer.map((tp) => ({
          id: tp.id,
          teamId: tp.teamId,
          playerId: tp.playerId,
          active: tp.active,
          player: tp.Player,
        })),
      }));
    }

    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      teams,
      settings: user.settings,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user route
router.put('/update', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const validatedData = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: validatedData,
      include: userInclude,
    });

    let teams: any[] = [];
    if (user.teams) {
      const team = user.teams as unknown as TeamWithLeague;
      teams = team.leagueTeams.map((lt) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        leagueId: lt.league.id,
        leagueName: lt.league.name,
        players: team.TeamPlayer.map((tp) => ({
          id: tp.id,
          teamId: tp.teamId,
          playerId: tp.playerId,
          active: tp.active,
          player: tp.Player,
        })),
      }));
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      teams,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ message: 'Failed to update user' });
  }
});

// Update user settings route
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // Accept any JSON object for settings
    const settings = req.body;
    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ error: 'Invalid settings object' });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { settings },
      select: { settings: true },
    });
    res.json({ settings: user.settings });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // In a JWT-based system, we don't need to do much server-side
    // as the token is stored client-side. But we can add any cleanup here if needed.

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
