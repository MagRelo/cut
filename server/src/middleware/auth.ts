import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { Prisma, User, Team, League } from '@prisma/client';
import { UnauthorizedError } from '../utils/errors.js';

interface JwtPayload {
  userId: string;
}

export type AuthTeam = {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  userType: string;
  teams: AuthTeam[];
};

type TeamWithLeague = Team & {
  leagueTeams: Array<{
    league: {
      id: string;
      name: string;
    };
  }>;
};

type UserWithTeams = User & {
  teams: TeamWithLeague | null;
};

// Helper type for routes that require authentication
export type AuthHandler = (
  req: Request & { user: AuthUser }, // Ensure user exists for authenticated routes
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

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

    const user = (await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: userInclude,
    })) as UserWithTeams | null;

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      name: user.name,
      userType: user.userType,
      teams: user.teams
        ? (user.teams.leagueTeams || []).map((lt) => ({
            id: user.teams!.id,
            name: user.teams!.name,
            leagueId: lt.league.id,
            leagueName: lt.league.name,
          }))
        : [],
    };

    (req as any).user = authUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
