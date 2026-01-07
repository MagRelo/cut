# PlatformToken Contract

## Purpose

The PlatformToken contract is a standard ERC20 token implementation (CUT token) used as the payment token for contests. It represents the platform's native token that users receive when depositing USDC.

## Responsibilities

- Implement ERC20 token standard
- Mint tokens (via DepositManager)
- Burn tokens (via DepositManager)
- Transfer tokens between users
- Track balances and allowances

## Key Features

- Standard ERC20 implementation
- Mintable (by DepositManager)
- Burnable (by DepositManager)
- Used as payment token in Contest contracts

## Usage

The PlatformToken is primarily used by:
- **DepositManager**: Mints on USDC deposit, burns on USDC withdrawal
- **Contest**: Accepts as payment for contest deposits
- **Users**: Hold and transfer tokens

## Token Details

- **Symbol**: CUT
- **Name**: Platform Token (or similar)
- **Decimals**: 18 (standard ERC20)
- **Total Supply**: Variable (minted on demand)

## Key Functions

Standard ERC20 functions:
- `transfer(to, amount)`: Transfer tokens
- `approve(spender, amount)`: Approve spending
- `transferFrom(from, to, amount)`: Transfer from approved account
- `balanceOf(account)`: Get balance
- `totalSupply()`: Get total supply

Minting/Burning (restricted):
- `mint(to, amount)`: Mint tokens (DepositManager only)
- `burn(from, amount)`: Burn tokens (DepositManager only)

## Dependencies

- **OpenZeppelin ERC20**: Base implementation
- **DepositManager**: Authorized minter/burner

## Design Decisions

### Why Standard ERC20?
- Compatibility with all wallets and tools
- Well-tested and secure
- Easy integration
- Standard interface

### Why Mintable/Burnable?
- 1:1 with USDC deposits
- Users can convert back to USDC
- Total supply matches deposited USDC
- No pre-minting needed

