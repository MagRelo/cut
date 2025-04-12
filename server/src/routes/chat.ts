import express from 'express';
import { ChatController } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const chatController = new ChatController();

// Get league channel details and state
router.get(
  '/leagues/:leagueId/channel',
  authenticateToken,
  chatController.getLeagueChannel.bind(chatController)
);

// Get channel messages with pagination
router.get(
  '/leagues/:leagueId/messages',
  authenticateToken,
  chatController.getChannelMessages.bind(chatController)
);

export default router;
