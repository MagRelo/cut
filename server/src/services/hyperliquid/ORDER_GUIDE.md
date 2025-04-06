# How to Use the Order Service

This guide explains how to use the order service to place trades on Hyperliquid. We'll cover common scenarios and explain the parameters in plain language.

## Basic Order Parameters

Every order requires these basic parameters:

- `symbol`: The trading pair (e.g., "BTC" for Bitcoin)
- `side`: Either "buy" or "sell"
- `orderType`: The type of order (see Order Types below)
- `size`: The amount you want to trade (in base currency)
- `leverage`: The leverage multiplier (e.g., 2 for 2x leverage, 10 for 10x leverage)

## Order Types

1. **Market Orders**

   - Use when you want to execute immediately at the best available price
   - Only requires `symbol`, `side`, `size`, and `leverage`
   - Example: Buy 0.1 BTC at market price with 10x leverage

2. **Limit Orders**
   - Use when you want to specify your own price
   - Requires `symbol`, `side`, `size`, `price`, and `leverage`
   - Example: Buy 0.1 BTC when price reaches $50,000 with 5x leverage

## Common Trading Scenarios

### 1. Buying Bitcoin with Different Leverage Levels

#### Example 1: $1000 Position with 2x Leverage

```json
{
  "symbol": "BTC",
  "side": "buy",
  "orderType": "market",
  "size": 0.05, // $1000 worth of BTC at $50,000
  "leverage": 2 // 2x leverage
}
```

This means:

- You're controlling $2000 worth of BTC ($1000 × 2x)
- Your position size is 0.05 BTC
- A 1% price move = 2% profit/loss on your $1000

#### Example 2: $1000 Position with 10x Leverage

```json
{
  "symbol": "BTC",
  "side": "buy",
  "orderType": "market",
  "size": 0.05, // $1000 worth of BTC at $50,000
  "leverage": 10 // 10x leverage
}
```

This means:

- You're controlling $10,000 worth of BTC ($1000 × 10x)
- Your position size is 0.05 BTC
- A 1% price move = 10% profit/loss on your $1000

#### Example 3: $1000 Position with 20x Leverage

```json
{
  "symbol": "BTC",
  "side": "buy",
  "orderType": "market",
  "size": 0.05, // $1000 worth of BTC at $50,000
  "leverage": 20 // 20x leverage
}
```

This means:

- You're controlling $20,000 worth of BTC ($1000 × 20x)
- Your position size is 0.05 BTC
- A 1% price move = 20% profit/loss on your $1000

### 2. Setting a Limit Order with Leverage

To place a limit order to buy Bitcoin with leverage when it reaches a specific price:

```json
{
  "symbol": "BTC",
  "side": "buy",
  "orderType": "limit",
  "size": 0.05,
  "price": 50000,
  "leverage": 10,
  "timeInForce": "GTC"
}
```

### 3. Selling with Stop Loss and Leverage

To sell a leveraged position with a stop loss:

```json
{
  "symbol": "BTC",
  "side": "sell",
  "orderType": "market",
  "size": 0.05,
  "leverage": 10,
  "reduceOnly": true
}
```

## Additional Parameters

- `reduceOnly`: Set to `true` if you want to close a position
- `postOnly`: Set to `true` if you want to be a market maker (provide liquidity)
- `timeInForce`:
  - "GTC" (Good Till Cancel) - Order remains active until cancelled
  - "IOC" (Immediate or Cancel) - Order executes immediately or is cancelled
  - "FOK" (Fill or Kill) - Order must execute completely or not at all

## Important Notes

1. **Position Sizing with Leverage**

   - Always calculate your position size based on your risk tolerance
   - Higher leverage means smaller price movements can liquidate your position
   - Example liquidation thresholds:
     - 2x leverage: 50% price move against you
     - 10x leverage: 10% price move against you
     - 20x leverage: 5% price move against you

2. **Risk Management with Leverage**

   - Use tighter stop losses with higher leverage
   - Consider using `reduceOnly` orders for closing positions
   - Monitor your positions regularly
   - Be aware of funding rates for leveraged positions

3. **Price Precision**

   - Prices should be specified in the base currency (e.g., USD for BTC)
   - Size should be specified in the asset being traded (e.g., BTC)
   - Leverage should be specified as a whole number (2, 5, 10, 20, etc.)

4. **Rate Limits**
   - The service has rate limits to prevent abuse
   - You can make up to 10 requests per minute
   - If you exceed the limit, you'll receive a 429 error with a retry time

## Example API Calls

### Market Buy Order with 10x Leverage

```bash
curl -X POST http://localhost:4000/api/hyperliquid/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC",
    "side": "buy",
    "orderType": "market",
    "size": 0.05,
    "leverage": 10
  }'
```

### Limit Sell Order with 5x Leverage

```bash
curl -X POST http://localhost:4000/api/hyperliquid/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC",
    "side": "sell",
    "orderType": "limit",
    "size": 0.05,
    "price": 50000,
    "leverage": 5,
    "timeInForce": "GTC"
  }'
```

## Error Handling

If something goes wrong, you'll receive an error response with details about what happened. Common errors include:

- Invalid parameters
- Insufficient funds
- Rate limit exceeded
- Market closed
- Invalid symbol
- Invalid leverage amount
- Position size exceeds maximum allowed
- Leverage exceeds maximum allowed

Always check the error message and handle errors appropriately in your application.
