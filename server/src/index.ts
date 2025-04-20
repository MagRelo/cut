import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teamRoutes from './routes/teams.js';
import authRoutes from './routes/auth.js';
import pgaRoutes from './routes/pga.js';
import leagueRoutes from './routes/leagues.js';
import hyperliquidRoutes from './routes/hyperliquid.js';
import playerRoutes from './routes/player.routes.js';
import tournamentRoutes from './routes/tournaments.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import publicLeagueRoutes from './routes/publicLeagues.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { requestLogger } from './middleware/logger.js';
import { startScoreUpdateCron } from './cron/scoreUpdate.js';
import { startCleanupCron } from './cron/cleanup.js';

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
  'HYPERLIQUID_API_URL',
  'HYPERLIQUID_PRIVATE_KEY',
  'PGA_API_KEY',
  'GETSTREAM_API_KEY',
  'GETSTREAM_API_SECRET',
  'GETSTREAM_APP_ID',
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

// Serve static files from the public directory
app.use(express.static('dist/public/dist'));

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
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public-leagues', publicLeagueRoutes);
// Protected routes
app.use('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route accessed successfully' });
});

// Serve index.html for all other routes to support client-side routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist/public/dist' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

try {
  console.log('Starting server initialization...');

  // Start the cron jobs
  startScoreUpdateCron();
  startCleanupCron();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error('Server startup failed:', error);
  process.exit(1);
}
