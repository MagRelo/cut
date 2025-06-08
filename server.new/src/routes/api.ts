import { Router } from 'express';
import authRoutes from './auth.js';
import tournamentRoutes from './tournament.js';
import userRoutes from './user.js';

const router = Router();

// Debug middleware
router.use((req, res, next) => {
  console.log('API Router:', req.method, req.url);
  next();
});

// Tournament routes
router.use('/tournaments', tournamentRoutes);

// Contest routes
// router.use('/contests', contestRoutes);

// User group routes
// router.use('/groups', userGroupRoutes);

// Lineup routes
// router.use('/lineups', lineupRoutes);

// Auth routes
console.log('Registering auth routes...');
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

export default router;
