import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { authenticateToken } from '../middleware/auth';
import { Prisma, User, Team, League } from '@prisma/client';
import { generateUserToken, ensureStreamUser } from '../lib/getStream';
import { AuthUser } from '../types/auth';

type TeamWithLeague = Team & {
  league: Pick<League, 'id' | 'name'>;
};

type UserWithTeams = User & {
  teams: TeamWithLeague[];
};

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userInclude = Prisma.validator<Prisma.UserInclude>()({
      teams: {
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    });

    const user = (await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    })) as UserWithTeams | null;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Generate GetStream token and ensure user exists
    const streamToken = generateUserToken(user.id);
    await ensureStreamUser(user.id, {
      name: user.name,
    });

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
      streamToken,
      teams: user.teams.map((team) => ({
        id: team.id,
        name: team.name,
        leagueId: team.league.id,
        leagueName: team.league.name,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Create GetStream user
    await ensureStreamUser(user.id, {
      name: user.name,
    });

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
      teams: [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        message:
          'If an account exists, you will receive a password reset email',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">
          Reset Password
        </a>
      `,
    });

    res.json({
      message: 'If an account exists, you will receive a password reset email',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as {
      userId: string;
    };

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user route
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userInclude = Prisma.validator<Prisma.UserInclude>()({
      teams: {
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    });

    const user = (await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: userInclude,
    })) as UserWithTeams | null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      teams: user.teams.map((team) => ({
        id: team.id,
        name: team.name,
        leagueId: team.league.id,
        leagueName: team.league.name,
      })),
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fresh stream token
router.get('/stream-token', authenticateToken, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate fresh GetStream token and ensure user exists
    const streamToken = generateUserToken(user.id);
    await ensureStreamUser(user.id, {
      name: user.name,
    });

    res.json({ streamToken });
  } catch (error) {
    console.error('Error generating stream token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
