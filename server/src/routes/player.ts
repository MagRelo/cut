import express from 'express';
import { playerController } from '../controllers/playerController.js';
const router = express.Router();

// Get active players (must be before /:id to prevent id validation)
router.get('/active', playerController.getActivePlayers);

export default router;
