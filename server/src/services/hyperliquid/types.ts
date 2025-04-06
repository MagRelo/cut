export type OrderType = {
  limit: {
    tif: 'Gtc' | 'Ioc' | 'Alo';
  };
};

export interface OrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: OrderType;
  size: number;
  price?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface OrderResult {
  orderId: string;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  filledSize: number;
  averagePrice: number;
  timestamp: number;
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface OrderError {
  code: string;
  message: string;
  details?: unknown;
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface OrderLog {
  orderId: string;
  userId: string;
  params: OrderParams;
  timestamp: number;
  status: 'attempt' | 'success' | 'error';
  error?: OrderError;
  result?: OrderResult;
}

export interface SimplifiedOrderParams {
  asset: string; // The asset symbol from the /assets endpoint
  amountUsdc: number; // Amount to trade in USDC
  leverage: number; // Leverage to use (e.g., 2 for 2x leverage)
}
