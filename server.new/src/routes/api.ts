import { Router } from 'express';
import authRoutes from './auth.js';
import tournamentRoutes from './tournament.js';
import userRoutes from './user.js';
import lineupRoutes from './lineup.js';
import contestRoutes from './contest.js';

const router = Router();

// Tournament routes
router.use('/tournaments', tournamentRoutes);

// Contest routes
router.use('/contests', contestRoutes);

// User group routes
// router.use('/groups', userGroupRoutes);

// Lineup routes
router.use('/lineup', lineupRoutes);

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

export default router;
