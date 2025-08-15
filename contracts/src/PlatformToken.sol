// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformToken is ERC20, Ownable {
    address public depositManager;

    event DepositManagerSet(address indexed depositManager);
    event DepositManagerMint(address indexed to, uint256 amount);
    event DepositManagerBurn(address indexed from, uint256 amount);

    constructor() ERC20("Cut Platform Token", "CUT") Ownable(msg.sender) {}

    modifier onlyDepositManager() {
        require(depositManager != address(0), "DepositManager not set");
        require(msg.sender == depositManager, "Only depositManager can call this function");
        _;
    }

    function setDepositManager(address _depositManager) external onlyOwner {
        require(_depositManager != address(0), "Invalid depositManager address");
        depositManager = _depositManager;
        emit DepositManagerSet(_depositManager);
    }

    function mint(address to, uint256 amount) external onlyDepositManager {
        // CHECKS
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // EFFECTS
        _mint(to, amount);
        
        // EVENTS
        emit DepositManagerMint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyDepositManager {
        // CHECKS
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        // EFFECTS
        _burn(from, amount);
        
        // EVENTS
        emit DepositManagerBurn(from, amount);
    }
} 