import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { Prisma, User, Team, League } from '@prisma/client';

interface JwtPayload {
  userId: string;
}

type AuthTeam = {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
};

type AuthUser = {
  id: string;
  email: string;
  name: string;
  teams: AuthTeam[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type TeamWithLeague = Team & {
  league: Pick<League, 'id' | 'name'>;
};

type UserWithTeams = User & {
  teams: TeamWithLeague[];
};

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
          league: {
            select: {
              id: true,
              name: true,
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
      email: user.email,
      name: user.name,
      teams: user.teams.map((team) => ({
        id: team.id,
        name: team.name,
        leagueId: team.league.id,
        leagueName: team.league.name,
      })),
    };

    req.user = authUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
