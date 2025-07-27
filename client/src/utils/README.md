# Blockchain Explorer Utility

This utility provides functions to generate blockchain explorer links for different networks and addresses.

## Features

- Support for multiple blockchain networks (Ethereum, Base, Polygon, Arbitrum, Optimism)
- Both mainnet and testnet support
- Generates HTML anchor tags or React JSX elements
- Automatic address shortening for display
- Customizable styling and text

## Supported Networks

| Chain ID | Network          | Explorer             |
| -------- | ---------------- | -------------------- |
| 1        | Ethereum Mainnet | Etherscan            |
| 11155111 | Sepolia Testnet  | Sepolia Etherscan    |
| 8453     | Base Mainnet     | BaseScan             |
| 84532    | Base Sepolia     | Base Sepolia         |
| 137      | Polygon Mainnet  | PolygonScan          |
| 80001    | Mumbai Testnet   | Mumbai PolygonScan   |
| 42161    | Arbitrum One     | Arbiscan             |
| 421614   | Arbitrum Sepolia | Arbitrum Sepolia     |
| 10       | Optimism         | Optimistic Etherscan |
| 11155420 | Optimism Sepolia | Optimism Sepolia     |

## Usage

### Basic URL Generation

```typescript
import { getExplorerUrl } from "./blockchain";

const address = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
const chainId = 84532; // Base Sepolia

const url = getExplorerUrl(address, chainId);
// Returns: "https://sepolia.basescan.org/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
```

### HTML Link Generation

```typescript
import { createExplorerLink } from "./blockchain";

const htmlLink = createExplorerLink(address, chainId, "View Contract");
// Returns: "<a href="..." target="_blank" rel="noopener noreferrer">View Contract</a>"
```

### React JSX Element

```typescript
import { createExplorerLinkJSX } from "./blockchain";

const jsxElement = createExplorerLinkJSX(
  address,
  chainId,
  "View on Explorer",
  "text-blue-600 hover:text-blue-800"
);
// Returns a React element that can be used in JSX
```

### In React Components

```tsx
import React from "react";
import { useChainId } from "wagmi";
import { createExplorerLinkJSX } from "./utils/blockchain";

function ContractDisplay({ address }: { address: string }) {
  const chainId = useChainId();

  return (
    <div>
      <h3>Contract Address</h3>
      <p>{address}</p>
      {chainId && createExplorerLinkJSX(address, chainId, "View on Explorer")}
    </div>
  );
}
```

## Functions

### `getExplorerUrl(address: string, chainId: number): string | null`

Generates a blockchain explorer URL for a given address and chain ID.

**Parameters:**

- `address`: The blockchain address (contract or wallet)
- `chainId`: The chain ID

**Returns:** The full explorer URL or null if chain is not supported

### `createExplorerLink(address: string, chainId: number, displayText?: string, className?: string): string | null`

Creates an HTML anchor tag element for a blockchain explorer link.

**Parameters:**

- `address`: The blockchain address
- `chainId`: The chain ID
- `displayText`: Optional text to display (defaults to shortened address)
- `className`: Optional CSS class for styling

**Returns:** HTML anchor element as string or null if chain is not supported

### `createExplorerLinkJSX(address: string, chainId: number, displayText?: string, className?: string): React.ReactElement | null`

Creates a React JSX element for a blockchain explorer link.

**Parameters:**

- `address`: The blockchain address
- `chainId`: The chain ID
- `displayText`: Optional text to display (defaults to shortened address)
- `className`: Optional CSS class for styling

**Returns:** JSX element or null if chain is not supported

### `getExplorerName(chainId: number): string | null`

Gets the explorer name for a given chain ID.

**Parameters:**

- `chainId`: The chain ID

**Returns:** The explorer name or null if chain is not supported

### `isChainSupported(chainId: number): boolean`

Checks if a chain ID is supported by the explorer utility.

**Parameters:**

- `chainId`: The chain ID to check

**Returns:** True if the chain is supported

## Example Implementation

The utility is currently being used in the ContestLobby component to display blockchain explorer links for:

1. **Contest Contract**: Links to the escrow contract address
2. **Payment Token**: Links to the payment token contract address

```tsx
// In ContestLobby.tsx
{
  contest?.address && chainId && (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Blockchain Details</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Contest Contract:</span>
          {createExplorerLinkJSX(contest.address, chainId, "View on Explorer")}
        </div>
        {escrowPaymentToken && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Payment Token:</span>
            {createExplorerLinkJSX(escrowPaymentToken, chainId, "View on Explorer")}
          </div>
        )}
      </div>
    </div>
  );
}
```
