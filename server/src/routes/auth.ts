import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { sendSMS } from '../lib/sms.js';
import { authenticateToken } from '../middleware/auth.js';
import { Prisma, User, Team, League, LeagueTeam } from '@prisma/client';
import { AuthUser } from '../middleware/auth.js';

type TeamWithLeague = Team & {
  leagueTeams: (LeagueTeam & {
    league: Pick<League, 'id' | 'name'>;
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
  anonymousGuid: z.string().uuid().optional(),
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
    },
  },
} satisfies Prisma.UserInclude;

// Request verification code
router.post('/request-verification', async (req, res) => {
  try {
    const { contact } = contactSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: contact }, { phone: contact }],
      },
    });

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          verificationCode,
          verificationCodeExpiresAt: expiresAt,
        },
      });
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          email: contact.includes('@') ? contact : null,
          phone: !contact.includes('@') ? contact : null,
          name: 'User', // Will be updated during registration
          verificationCode,
          verificationCodeExpiresAt: expiresAt,
        },
      });
    }

    // Send verification code
    if (contact.includes('@')) {
      // test phone number
      const testEmail = 'mattlovan@gmail.com';

      await sendEmail({
        // to: contact,
        to: testEmail,
        subject: 'Your Verification Code',
        html: `
          <h1>Your Verification Code</h1>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 15 minutes.</p>
        `,
      });
      console.log(
        `Email verification code for ${contact}: ${verificationCode}`
      );
    } else {
      // test phone number
      const testPhoneNumber = '+12088712928';

      await sendSMS({
        // to: contact,
        to: testPhoneNumber,
        body: `Your verification code is: ${verificationCode}`,
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

    // If this is a registration (has name), update user details
    if (name) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
      });

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

        if (existingTeam) {
          // If user already has a team, we need to merge the teams
          // First, transfer all players from anonymous teams to the existing team
          for (const anonymousTeam of anonymousTeams) {
            await prisma.teamPlayer.updateMany({
              where: { teamId: anonymousTeam.id },
              data: { teamId: existingTeam.id },
            });

            // Then delete the anonymous team
            await prisma.team.delete({
              where: { id: anonymousTeam.id },
            });
          }
        } else if (anonymousTeams.length > 0) {
          // If user doesn't have a team, transfer the first anonymous team
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
        }
      }
    }

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
        leagueId: lt.league.id,
        leagueName: lt.league.name,
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
        leagueId: lt.league.id,
        leagueName: lt.league.name,
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
        leagueId: lt.league.id,
        leagueName: lt.league.name,
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

export default router;
