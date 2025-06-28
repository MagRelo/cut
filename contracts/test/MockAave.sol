// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IPool } from "@aave/interfaces/IPool.sol";
import { IPoolAddressesProvider } from "@aave/interfaces/IPoolAddressesProvider.sol";
import { DataTypes } from "../lib/aave-v3-core/contracts/protocol/libraries/types/DataTypes.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAToken is IERC20 {
    string public name = "Mock aToken";
    string public symbol = "maTOKEN";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "Insufficient balance");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

abstract contract MockPool is IPool {
    address public aToken;
    mapping(address => uint256) public userBalances;
    MockAToken public mockAToken;
    
    constructor(address _aToken) {
        aToken = _aToken;
        mockAToken = MockAToken(_aToken);
    }
    
    function getReserveData(address) external view override returns (DataTypes.ReserveData memory data) {
        data.aTokenAddress = aToken;
    }
    
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external override {
        userBalances[onBehalfOf] += amount;
        mockAToken.mint(onBehalfOf, amount);
    }
    
    function withdraw(address asset, uint256 amount, address to) external override returns (uint256) {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
        mockAToken.burn(msg.sender, amount);
        // In a real Aave implementation, this would transfer tokens to the 'to' address
        // For our mock, we just return the amount
        return amount;
    }
}

abstract contract MockPoolAddressesProvider is IPoolAddressesProvider {
    address public pool;
    constructor(address _pool) {
        pool = _pool;
    }
    function getPool() external view override returns (address) {
        return pool;
    }
} 