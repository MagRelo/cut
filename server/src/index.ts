import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import teamsRoutes from './routes/teams.js';
import adminRoutes from './routes/admin.js';
import tournamentRoutes from './routes/tournament.js';
import publicLeagueRoutes from './routes/public.js';
import timelineRoutes from './routes/timeline.js';
// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { startScoreUpdateCron } from './cron/scoreUpdate.js';
import { startCleanupCron } from './cron/cleanup.js';
import { startApiHealthCheckCron } from './cron/apiHealthCheck.js';

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
app.use(
  express.static('dist/public/dist', {
    maxAge: '1h', // Cache for 1 hour
    etag: true, // Enable ETag
    lastModified: true, // Enable Last-Modified
  })
);

// Request logging
app.use(requestLogger);

// Register routes
// app.use('/api/leagues', leagueRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/public', publicLeagueRoutes);

// Serve index.html for all other routes to support client-side routing
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
  startApiHealthCheckCron();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error('Server startup failed:', error);
  process.exit(1);
}
