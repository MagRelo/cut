import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get current user information
router.get('/me', async (req, res) => {
  try {
    
    // this will be a  


  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

export default router;
