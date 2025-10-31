// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev This contract mocks USDC for testing purposes.
 * USDC uses 6 decimals instead of the standard 18 decimals.
 * When deploying to production, this contract should not be deployed
 * and instead the actual USDC contract address should be used.
 *
 * Real USDC functions we need to mock:
 * - transfer(address to, uint256 amount) - returns bool
 * - transferFrom(address from, address to, uint256 amount) - returns bool
 * - balanceOf(address account) - returns uint256
 * - decimals() - returns 6
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("USD Coin (xUSDC)", "xUSDC") Ownable(msg.sender) {}

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * USDC uses 6 decimals instead of the standard 18 decimals.
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must be the owner.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `from`, reducing the
     * total supply.
     *
     * See {ERC20-_burn}.
     *
     * Requirements:
     *
     * - the caller must be the owner.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
