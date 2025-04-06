import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { OrderService } from '../services/hyperliquid/orderService';
import { WalletService } from '../services/hyperliquid/walletService';
import { SimplifiedOrderParams } from '../services/hyperliquid/types';

const router = express.Router();
const orderService = new OrderService();
const walletService = new WalletService();

// Order endpoints
router.post('/order', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderParams: SimplifiedOrderParams = req.body;
    const result = await orderService.placeSimplifiedOrder(userId, orderParams);
    res.json(result);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

router.delete('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    await orderService.cancelOrder(userId, orderId);
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    const result = await orderService.getOrderStatus(userId, orderId);
    res.json(result);
  } catch (error) {
    console.error('Error getting order status:', error);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

// Wallet endpoints
// router.get('/balance', authenticateToken, async (req, res) => {
router.get('/balance', async (req, res) => {
  try {
    // const userId = req.user?.id;
    // if (!userId) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const balance = await walletService.getBalance();

    res.json({ balance });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// router.get('/positions', authenticateToken, async (req, res) => {
router.get('/positions', async (req, res) => {
  try {
    // const userId = req.user?.id;
    // if (!userId) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const positions = await walletService.getPositions();
    res.json({ positions });
  } catch (error) {
    console.error('Error getting positions:', error);
    res.status(500).json({ error: 'Failed to get positions' });
  }
});

router.get('/open-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const openOrders = await walletService.getOpenOrders(userId);
    res.json({ openOrders });
  } catch (error) {
    console.error('Error getting open orders:', error);
    res.status(500).json({ error: 'Failed to get open orders' });
  }
});

router.get('/assets', async (req, res) => {
  try {
    const assets = await orderService.getAllAssets();
    res.json({ assets });
  } catch (error) {
    console.error('Error getting tradable assets:', error);
    res.status(500).json({ error: 'Failed to get tradable assets' });
  }
});

router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await orderService.getCurrentPrice(symbol);
    res.json({ price });
  } catch (error) {
    console.error('Error getting price:', error);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

export default router;
