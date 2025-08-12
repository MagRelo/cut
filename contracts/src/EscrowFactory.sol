// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Escrow.sol";

contract EscrowFactory is Ownable {
    mapping(address => bool) public oracles;
    Escrow[] public escrows;
    address public platformToken;

    event EscrowCreated(address indexed escrow, address indexed host, uint256 depositAmount);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event PlatformTokenUpdated(address indexed oldToken, address indexed newToken);

    constructor(
        address _platformToken
    ) Ownable(msg.sender) {
        platformToken = _platformToken;
    }

    function setPlatformToken(address _newPlatformToken) external onlyOwner {
        require(_newPlatformToken != address(0), "Invalid platform token address");
        address oldToken = platformToken;
        platformToken = _newPlatformToken;
        emit PlatformTokenUpdated(oldToken, _newPlatformToken);
    }

    function createEscrow(
        string memory name,
        uint256 depositAmount,
        uint256 endTime,
        address oracle
    ) external returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(oracles[oracle], "Not an approved oracle");
        require(depositAmount > 0, "Deposit amount must be greater than 0");

        Escrow escrow = new Escrow(
            name,
            depositAmount,
            endTime,
            platformToken,
            oracle
        );

        escrows.push(escrow);
        emit EscrowCreated(address(escrow), msg.sender, depositAmount);
        return address(escrow);
    }

    function addOracle(address oracle) external onlyOwner {
        require(!oracles[oracle], "Already oracle");
        oracles[oracle] = true;
        emit OracleAdded(oracle);
    }

    function removeOracle(address oracle) external onlyOwner {
        require(oracles[oracle], "Not oracle");
        oracles[oracle] = false;
        emit OracleRemoved(oracle);
    }

    function getEscrows() external view returns (Escrow[] memory) {
        return escrows;
    }
} 