import * as hl from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';
import { OrderParams, OrderResult } from './types';
import type { PublicClient } from '@nktkas/hyperliquid';

export class HyperliquidClient {
  private transport: hl.HttpTransport;
  private publicClient: hl.PublicClient;
  private walletClient: hl.WalletClient;
  private static instance: HyperliquidClient;

  private constructor() {
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY || '';
    const isTestnet = process.env.HYPERLIQUID_NETWORK === 'testnet';

    if (!privateKey) {
      throw new Error('Missing required Hyperliquid private key');
    }

    console.log('Creating new Hyperliquid client with config:', {
      testnet: isTestnet,
      privateKeyLength: privateKey.length,
    });

    // Initialize transport and clients
    this.transport = new hl.HttpTransport({ isTestnet });
    this.publicClient = new hl.PublicClient({ transport: this.transport });

    // Initialize wallet client
    const account = privateKeyToAccount(`0x${privateKey}`);
    this.walletClient = new hl.WalletClient({
      wallet: account,
      transport: this.transport,
    });
  }

  public static getInstance(): HyperliquidClient {
    if (!HyperliquidClient.instance) {
      HyperliquidClient.instance = new HyperliquidClient();
    }
    return HyperliquidClient.instance;
  }

  private convertToHyperliquidOrder(params: OrderParams) {
    return {
      a: 0, // Asset index - we'll need to get this from the asset name
      b: params.side === 'buy',
      p: params.price?.toString() || '0',
      s: params.size.toString(),
      r: params.reduceOnly || false,
      t: {
        limit: {
          tif:
            (params.timeInForce || 'GTC').toUpperCase() === 'GTC'
              ? ('Gtc' as const)
              : (params.timeInForce || 'GTC').toUpperCase() === 'IOC'
              ? ('Ioc' as const)
              : ('Alo' as const),
        },
      },
    };
  }

  public async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      const response = await this.walletClient.order({
        orders: [this.convertToHyperliquidOrder(params)],
        grouping: 'na',
      });

      // Extract the first order status from the response
      const status = response.response.data.statuses[0];

      // Handle different status types
      if ('error' in status) {
        return {
          orderId: '0',
          status: 'rejected',
          filledSize: 0,
          averagePrice: 0,
          timestamp: Date.now(),
        };
      }

      if ('filled' in status) {
        return {
          orderId: status.filled.oid.toString(),
          status: 'filled',
          filledSize: parseFloat(status.filled.totalSz),
          averagePrice: parseFloat(status.filled.avgPx),
          timestamp: Date.now(),
        };
      }

      if ('resting' in status) {
        return {
          orderId: status.resting.oid.toString(),
          status: 'open',
          filledSize: 0,
          averagePrice: 0,
          timestamp: Date.now(),
        };
      }

      throw new Error('Unknown order status type');
    } catch (error) {
      throw new Error(
        `Failed to place order: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.walletClient.cancel({
        cancels: [
          {
            a: 0, // Asset index
            o: parseInt(orderId),
          },
        ],
      });
    } catch (error) {
      throw new Error(
        `Failed to cancel order: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async getOrderStatus(orderId: string): Promise<OrderResult> {
    try {
      const walletAddress = process.env.HYPERLIQUID_PUBLIC_KEY || '';
      const orders = await this.publicClient.openOrders({
        user: `0x${walletAddress}`,
      });
      const order = orders.find((o) => o.oid.toString() === orderId);

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      return {
        orderId: order.oid.toString(),
        status: 'open', // If it's in openOrders, it's open
        filledSize: parseFloat(order.sz),
        averagePrice: 0, // Not available in open orders
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get order status: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async getBalance(): Promise<number> {
    try {
      const walletAddress = process.env.HYPERLIQUID_PUBLIC_KEY || '';
      const info = await this.publicClient.clearinghouseState({
        user: `0x${walletAddress}`,
      });

      if (!info?.marginSummary?.accountValue) {
        throw new Error('Invalid response from Hyperliquid API');
      }

      return parseFloat(info.marginSummary.accountValue);
    } catch (error) {
      console.error('Error in getBalance:', error);
      throw new Error(
        `Failed to get balance: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async getPositions(): Promise<
    { symbol: string; size: number; entryPrice: number }[]
  > {
    try {
      const walletAddress = process.env.HYPERLIQUID_PUBLIC_KEY || '';
      const info = await this.publicClient.clearinghouseState({
        user: `0x${walletAddress}`,
      });

      return info.assetPositions
        .filter((pos) => parseFloat(pos.position.szi) !== 0)
        .map((pos) => ({
          symbol: pos.position.coin,
          size: parseFloat(pos.position.szi),
          entryPrice: parseFloat(pos.position.entryPx),
        }));
    } catch (error) {
      throw new Error(
        `Failed to get positions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async getAllAssets(): Promise<{ perp: string[]; spot: string[] }> {
    try {
      const meta = await this.publicClient.meta();
      return {
        perp: meta.universe.map((asset) => asset.name),
        spot: [], // The new API might not support spot assets directly
      };
    } catch (error) {
      throw new Error(
        `Failed to get all assets: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  public async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Make a direct request to avoid type issues
      const response = await this.transport.request('info', {
        type: 'meta',
      });

      const meta = response as {
        universe: Array<{ name: string; markPrice: string }>;
      };
      const asset = meta.universe.find((asset) => asset.name === symbol);

      if (!asset) {
        throw new Error(`Asset ${symbol} not found`);
      }

      console.log('Asset:', asset);

      if (!asset.markPrice) {
        throw new Error(`No price data available for ${symbol}`);
      }

      return parseFloat(asset.markPrice);
    } catch (error) {
      console.error('Error getting price:', error);
      throw new Error(
        `Failed to get current price for ${symbol}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
