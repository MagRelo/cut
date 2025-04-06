import { HyperliquidClient } from './client';
import {
  OrderParams,
  OrderResult,
  OrderError,
  OrderLog,
  RateLimitConfig,
  SimplifiedOrderParams,
} from './types';
import { OrderType } from 'hyperliquid';
import { logOrderAttempt, logOrderResult } from './orderLogging';

export class OrderService {
  private client: HyperliquidClient;
  private rateLimitConfig: RateLimitConfig;
  private orderAttempts: Map<string, number[]>;

  constructor(
    rateLimitConfig: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
  ) {
    this.client = HyperliquidClient.getInstance();
    this.rateLimitConfig = rateLimitConfig;
    this.orderAttempts = new Map();
  }

  private validateOrderParams(params: OrderParams): void {
    if (!params.symbol || !params.side || !params.orderType || !params.size) {
      throw new Error('Missing required order parameters');
    }

    if (params.size <= 0) {
      throw new Error('Order size must be greater than 0');
    }

    if (params.price !== undefined && params.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const attempts = this.orderAttempts.get(userId) || [];
    const windowStart = now - this.rateLimitConfig.windowMs;

    // Remove old attempts
    const recentAttempts = attempts.filter(
      (timestamp) => timestamp > windowStart
    );

    if (recentAttempts.length >= this.rateLimitConfig.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    recentAttempts.push(now);
    this.orderAttempts.set(userId, recentAttempts);
  }

  private handleOrderError(error: unknown): OrderError {
    const orderError: OrderError = {
      code: 'ORDER_ERROR',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };

    return orderError;
  }

  public async placeOrder(
    userId: string,
    params: OrderParams
  ): Promise<OrderResult> {
    const orderId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Validate parameters
      this.validateOrderParams(params);

      // Check rate limit
      await this.checkRateLimit(userId);

      // Log attempt
      await logOrderAttempt({
        orderId,
        userId,
        params,
        timestamp: Date.now(),
        status: 'attempt',
      });

      // Place order
      const result = await this.client.placeOrder(params);

      // Log success
      await logOrderResult({
        orderId,
        userId,
        params,
        timestamp: Date.now(),
        status: 'success',
        result,
      });

      return result;
    } catch (error) {
      const orderError = this.handleOrderError(error);

      // Log error
      await logOrderResult({
        orderId,
        userId,
        params,
        timestamp: Date.now(),
        status: 'error',
        error: orderError,
      });

      throw orderError;
    }
  }

  public async cancelOrder(userId: string, orderId: string): Promise<void> {
    try {
      await this.client.cancelOrder(orderId);
    } catch (error) {
      this.handleOrderError(error);
      throw error;
    }
  }

  public async getOrderStatus(
    userId: string,
    orderId: string
  ): Promise<OrderResult> {
    try {
      return await this.client.getOrderStatus(orderId);
    } catch (error) {
      this.handleOrderError(error);
      throw error;
    }
  }

  public async getAllAssets(): Promise<{ perp: string[]; spot: string[] }> {
    try {
      return await this.client.getAllAssets();
    } catch (error) {
      this.handleOrderError(error);
      throw error;
    }
  }

  public async getCurrentPrice(symbol: string): Promise<number> {
    try {
      return await this.client.getCurrentPrice(symbol);
    } catch (error) {
      this.handleOrderError(error);
      throw error;
    }
  }

  private async convertSimplifiedToOrderParams(
    params: SimplifiedOrderParams,
    userId: string
  ): Promise<OrderParams> {
    // Get the asset type (perp or spot) and validate the asset exists
    const assets = await this.client.getAllAssets();
    const isPerp = assets.perp.includes(params.asset);
    const isSpot = assets.spot.includes(params.asset);

    if (!isPerp && !isSpot) {
      throw new Error(`Asset ${params.asset} not found in tradable assets`);
    }

    // Get the current price of the asset
    const currentPrice = await this.client.getCurrentPrice(params.asset);
    if (!currentPrice || currentPrice <= 0) {
      throw new Error(`Invalid current price for ${params.asset}`);
    }

    // Calculate the order size in terms of the asset
    // Example: If amountUsdc = 1000 and currentPrice = 50000, then size = 0.02 BTC
    const orderSize = params.amountUsdc / currentPrice;

    // Round the order size to 6 decimal places to avoid precision issues
    const roundedOrderSize = Math.round(orderSize * 1000000) / 1000000;

    return {
      symbol: params.asset,
      side: 'buy', // We'll add side as a parameter later if needed
      orderType: {
        limit: {
          tif: 'Gtc',
        },
      },
      size: roundedOrderSize,
      leverage: params.leverage,
      reduceOnly: false,
      postOnly: false,
      timeInForce: 'GTC',
    };
  }

  public async placeSimplifiedOrder(
    userId: string,
    params: SimplifiedOrderParams
  ): Promise<OrderResult> {
    try {
      const orderParams = await this.convertSimplifiedToOrderParams(
        params,
        userId
      );
      return await this.placeOrder(userId, orderParams);
    } catch (error) {
      this.handleOrderError(error);
      throw error;
    }
  }
}
