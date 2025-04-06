import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teamRoutes from './routes/teams';
import authRoutes from './routes/auth';
import pgaRoutes from './routes/pga';
import leagueRoutes from './routes/leagues';
import hyperliquidRoutes from './routes/hyperliquid';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { requestLogger } from './middleware/logger';
import { startScoreUpdateCron } from './cron/scoreUpdate';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
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
