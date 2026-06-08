// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "solmate/tokens/ERC20.sol";
import {Owned} from "solmate/auth/Owned.sol";

/**
 * @title MockUSDC
 * @dev Mintable 6-decimal token for Base Sepolia only. Production uses real USDC.
 */
contract MockUSDC is ERC20, Owned {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("USD Coin (xUSDC)", "xUSDC", DECIMALS) Owned(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
