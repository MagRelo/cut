import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import apiRoutes from './routes/api.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'test'
    ? '.env.test'
    : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

dotenv.config({ path: envFile });

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'PGA_API_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
const port = process.env.PORT || 4000;

// Request logging
app.use(requestLogger);

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

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Serve static files from the public directory
app.use(
  express.static('dist/public/dist', {
    maxAge: '1h', // Cache for 1 hour
    etag: true, // Enable ETag
    lastModified: true, // Enable Last-Modified
  })
);

// Serve index.html for all other routes to support client-side routing
app.get('*', (req, res) => {
  console.log('Catch-all route hit:', req.url);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile('index.html', { root: 'dist/public/dist' });
});

try {
  console.log('Starting server initialization...');

  app.listen(port, () => {
    console.log(`[NEW]Server running on port ${port}`);
  });
} catch (error) {
  console.error('[NEW]Server startup failed:', error);
  process.exit(1);
}
