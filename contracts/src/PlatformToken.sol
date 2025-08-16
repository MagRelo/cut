// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PlatformToken
 * @author Bet the Cut Team
 * @dev ERC20 token for the Bet the Cut platform (CUT)
 * 
 * This token implements a simple ERC20 with restricted minting and burning capabilities.
 * Only the designated DepositManager contract can mint and burn tokens.
 * 
 * Key Features:
 * - Standard ERC20 functionality
 * - Restricted minting/burning to DepositManager only
 * - Owner-controlled DepositManager assignment
 * - Comprehensive event logging
 * 
 * @custom:security This contract uses OpenZeppelin's Ownable for access control
 */
contract PlatformToken is ERC20, Ownable {
    /// @notice Address of the DepositManager contract that can mint and burn tokens
    address public depositManager;

    /// @notice Emitted when the DepositManager address is set
    /// @param depositManager The new DepositManager address
    event DepositManagerSet(address indexed depositManager);
    
    /// @notice Emitted when tokens are minted by the DepositManager
    /// @param to The address receiving the minted tokens
    /// @param amount The amount of tokens minted
    event DepositManagerMint(address indexed to, uint256 amount);
    
    /// @notice Emitted when tokens are burned by the DepositManager
    /// @param from The address having tokens burned
    /// @param amount The amount of tokens burned
    event DepositManagerBurn(address indexed from, uint256 amount);

    /**
     * @dev Constructor initializes the ERC20 token with name "Cut Platform Token" and symbol "CUT"
     * Sets the deployer as the owner of the contract
     */
    constructor() ERC20("Cut Platform Token", "CUT") Ownable(msg.sender) {}

    /**
     * @dev Modifier to restrict function access to only the DepositManager contract
     * @notice Reverts if DepositManager is not set or caller is not the DepositManager
     */
    modifier onlyDepositManager() {
        require(depositManager != address(0), "DepositManager not set");
        require(msg.sender == depositManager, "Only depositManager can call this function");
        _;
    }

    /**
     * @notice Sets the DepositManager contract address
     * @dev Only callable by the contract owner
     * @param _depositManager The address of the DepositManager contract
     * 
     * Requirements:
     * - Caller must be the contract owner
     * - _depositManager must not be the zero address
     * 
     * Emits a {DepositManagerSet} event
     */
    function setDepositManager(address _depositManager) external onlyOwner {
        require(_depositManager != address(0), "Invalid depositManager address");
        depositManager = _depositManager;
        emit DepositManagerSet(_depositManager);
    }

    /**
     * @notice Mints new tokens to a specified address
     * @dev Only callable by the DepositManager contract
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * 
     * Requirements:
     * - Caller must be the DepositManager contract
     * - to must not be the zero address
     * - amount must be greater than 0
     * 
     * Emits a {DepositManagerMint} event
     */
    function mint(address to, uint256 amount) external onlyDepositManager {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        
        emit DepositManagerMint(to, amount);
    }

    /**
     * @notice Burns tokens from a specified address
     * @dev Only callable by the DepositManager contract
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     * 
     * Requirements:
     * - Caller must be the DepositManager contract
     * - from must not be the zero address
     * - amount must be greater than 0
     * - from must have sufficient balance to burn
     * 
     * Emits a {DepositManagerBurn} event
     */
    function burn(address from, uint256 amount) external onlyDepositManager {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        
        emit DepositManagerBurn(from, amount);
    }
} 