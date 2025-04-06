import { describe, it, expect, beforeAll } from 'vitest';
import { HyperliquidClient } from './client';
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

describe('HyperliquidClient Integration Tests', () => {
  let client: HyperliquidClient;

  beforeAll(() => {
    // Ensure we're using testnet credentials
    process.env.HYPERLIQUID_NETWORK = 'testnet';

    // Make sure required env vars are set
    if (
      !process.env.HYPERLIQUID_PRIVATE_KEY ||
      !process.env.HYPERLIQUID_PUBLIC_KEY
    ) {
      console.warn('Missing Hyperliquid credentials - tests will be skipped');
      return;
    }

    client = HyperliquidClient.getInstance();
  });

  describe('Market Data', () => {
    it.runIf(process.env.HYPERLIQUID_PRIVATE_KEY)(
      'should fetch all available assets',
      async () => {
        const assets = await client.getAllAssets();

        expect(assets).toBeDefined();
        expect(assets.perp).toBeInstanceOf(Array);
        expect(assets.spot).toBeInstanceOf(Array);
        expect(assets.perp.length).toBeGreaterThan(0);

        // Log the assets to see what's available
        // console.log('Available assets:', assets);
      },
      10000
    ); // Increase timeout for API call

    it.runIf(process.env.HYPERLIQUID_PRIVATE_KEY)(
      'should get current price for an available asset',
      async () => {
        // First get the list of assets
        const assets = await client.getAllAssets();
        const testAsset = assets.perp[0]; // Use the first available perpetual asset

        console.log('Testing price fetch for asset:', testAsset);
        const price = await client.getCurrentPrice(testAsset);

        expect(price).toBeDefined();
        expect(typeof price).toBe('number');
        expect(price).toBeGreaterThan(0);
      },
      10000
    );

    it.runIf(process.env.HYPERLIQUID_PRIVATE_KEY)(
      'should throw error for invalid asset',
      async () => {
        await expect(client.getCurrentPrice('INVALID-PERP')).rejects.toThrow();
      }
    );
  });

  describe('Account Data', () => {
    it.runIf(process.env.HYPERLIQUID_PRIVATE_KEY)(
      'should fetch account balance',
      async () => {
        const balance = await client.getBalance();

        expect(balance).toBeDefined();
        expect(typeof balance).toBe('number');
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      10000
    );

    it.runIf(process.env.HYPERLIQUID_PRIVATE_KEY)(
      'should fetch positions',
      async () => {
        const positions = await client.getPositions();

        expect(positions).toBeDefined();
        expect(Array.isArray(positions)).toBe(true);

        // If there are positions, verify their structure
        positions.forEach((position) => {
          expect(position).toHaveProperty('symbol');
          expect(position).toHaveProperty('size');
          expect(position).toHaveProperty('entryPrice');
          expect(typeof position.size).toBe('number');
          expect(typeof position.entryPrice).toBe('number');
        });
      },
      10000
    );
  });

  // Note: We're not testing order placement in integration tests
  // as it would require real funds. Those should be tested in a separate
  // suite with mock orders or very small test amounts
});
