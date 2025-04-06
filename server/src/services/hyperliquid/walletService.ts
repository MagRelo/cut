import { HyperliquidClient } from './client';
import { OrderError } from './types';

export class WalletService {
  private client: HyperliquidClient;

  constructor() {
    this.client = HyperliquidClient.getInstance();
  }

  private handleWalletError(error: unknown): OrderError {
    const walletError: OrderError = {
      code: 'WALLET_ERROR',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown wallet error occurred',
      details: error,
    };

    // TODO: Implement proper error logging
    console.error('Wallet error:', JSON.stringify(walletError));

    return walletError;
  }

  async getBalance(): Promise<number> {
    try {
      return await this.client.getBalance();
    } catch (error) {
      this.handleWalletError(error);
      return 0;
    }
  }

  async getPositions(): Promise<
    Array<{ symbol: string; size: number; entryPrice: number }>
  > {
    try {
      return await this.client.getPositions();
    } catch (error) {
      this.handleWalletError(error);
      return [];
    }
  }

  public async getOpenOrders(
    userId: string
  ): Promise<
    Array<{ orderId: string; symbol: string; side: string; size: number }>
  > {
    try {
      // TODO: Implement open orders fetching from Hyperliquid
      // This is a placeholder until we implement the actual open orders fetching
      return [];
    } catch (error) {
      this.handleWalletError(error);
      throw error;
    }
  }
}
