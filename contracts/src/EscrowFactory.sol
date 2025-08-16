// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @author Bet the Cut Team
 * @dev Factory contract for creating and managing Escrow contracts
 * 
 * This contract serves as a factory for creating Escrow contracts with consistent
 * configuration. It maintains a registry of all created escrows and allows the
 * caller to create escrows with different payment tokens.
 * 
 * Key Features:
 * - Creates Escrow contracts with flexible payment token configuration
 * - Maintains registry of all created escrows
 * - Centralized escrow management
 */
contract EscrowFactory {
    /// @notice Array of all created Escrow contracts
    Escrow[] public escrows;

    /// @notice Emitted when a new escrow is created
    /// @param escrow The address of the newly created escrow contract
    /// @param host The address of the user who created the escrow
    /// @param depositAmount The deposit amount required for the escrow
    event EscrowCreated(address indexed escrow, address indexed host, uint256 depositAmount);
    


    /**
     * @notice Creates a new Escrow contract with the specified parameters
     * @dev Deploys a new Escrow contract and adds it to the registry
     * @param depositAmount The amount each participant must deposit
     * @param expiry The timestamp when the escrow expires
     * @param paymentToken The address of the payment token to use for this escrow
     * @param paymentTokenDecimals The number of decimal places for the payment token
     * @param oracle The address of the oracle that controls the escrow
     * @param oracleFee The oracle fee in basis points (max 10000 = 100%)
     * @return address The address of the newly created escrow contract
     * 
     * This function creates a new Escrow contract with the provided parameters.
     * Each escrow can use a different payment token, providing flexibility
     * for different use cases. The caller becomes the "host" of the escrow
     * (tracked in the event).
     * 
     * Requirements:
     * - expiry must be in the future
     * - paymentToken must not be the zero address
     * - oracle must not be the zero address
     * - depositAmount must be greater than 0
     * - oracleFee must not exceed 10000 (100%)
     * 
     * Emits an {EscrowCreated} event
     */
    function createEscrow(
        uint256 depositAmount,
        uint256 expiry,
        address paymentToken,
        uint8 paymentTokenDecimals,
        address oracle,
        uint256 oracleFee
    ) external returns (address) {
        require(expiry > block.timestamp, "Expiry must be in future");
        require(paymentToken != address(0), "Payment token cannot be zero address");
        require(oracle != address(0), "Oracle cannot be zero address");
        require(depositAmount > 0, "Deposit amount must be greater than 0");
        require(oracleFee <= 10000, "Oracle fee cannot exceed 100%");

        Escrow escrow = new Escrow(
            depositAmount,
            expiry,
            paymentToken,
            paymentTokenDecimals,
            oracle,
            oracleFee
        );

        escrows.push(escrow);
        emit EscrowCreated(address(escrow), msg.sender, depositAmount);
        return address(escrow);
    }

    /**
     * @notice Gets all created escrow contracts
     * @return escrows Array of all Escrow contract addresses created by this factory
     */
    function getEscrows() external view returns (Escrow[] memory) {
        return escrows;
    }
} 