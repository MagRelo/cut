import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teamRoutes from './routes/teams';
import authRoutes from './routes/auth';
import pgaRoutes from './routes/pga';
import leagueRoutes from './routes/leagues';
import hyperliquidRoutes from './routes/hyperliquid';
import playerRoutes from './routes/players';
import tournamentRoutes from './routes/tournaments';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { requestLogger } from './middleware/logger';
import { startScoreUpdateCron } from './cron/scoreUpdate';

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'test'
    ? '.env.test'
    : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

dotenv.config({ path: envFile });

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
  'HYPERLIQUID_API_URL',
  'HYPERLIQUID_PRIVATE_KEY',
  'PGA_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// Request logging
app.use(requestLogger);

// Register routes
app.use('/api/teams', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pga', pgaRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/hyperliquid', hyperliquidRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Protected routes
app.use('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route accessed successfully' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

try {
  console.log('Starting server initialization...');

  // Start the cron job for score updates
  startScoreUpdateCron();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error('Server startup failed:', error);
  process.exit(1);
}
