// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformToken is ERC20, Ownable {
    address public tokenManager;

    event TokenManagerSet(address indexed tokenManager);
    event TokenManagerMint(address indexed to, uint256 amount);
    event TokenManagerBurn(address indexed from, uint256 amount);

    constructor() ERC20("Cut Platform Token", "CUT") Ownable(msg.sender) {}

    modifier onlyTokenManager() {
        require(tokenManager != address(0), "TokenManager not set");
        require(msg.sender == tokenManager, "Only tokenManager can call this function");
        _;
    }

    function setTokenManager(address _tokenManager) external onlyOwner {
        require(_tokenManager != address(0), "Invalid tokenManager address");
        tokenManager = _tokenManager;
        emit TokenManagerSet(_tokenManager);
    }

    function mint(address to, uint256 amount) external onlyTokenManager {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
        emit TokenManagerMint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyTokenManager {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        _burn(from, amount);
        emit TokenManagerBurn(from, amount);
    }
} 