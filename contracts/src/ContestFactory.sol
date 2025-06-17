// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./Contest.sol";

contract ContestFactory is Ownable {
    uint256 public platformFee; // in basis points (1% = 100)
    mapping(address => bool) public oracles;
    Contest[] public contests;
    address public immutable paymentToken;
    uint8 public immutable paymentTokenDecimals;
    address public immutable aavePoolAddressesProvider;

    event ContestCreated(address indexed contest, address indexed host, uint256 entryFee);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event PlatformFeeUpdated(uint256 newFee);

    constructor(
        uint256 _platformFee, 
        address _paymentToken,
        address _aavePoolAddressesProvider
    ) Ownable(msg.sender) {
        platformFee = _platformFee;
        paymentToken = _paymentToken;
        paymentTokenDecimals = IERC20Metadata(_paymentToken).decimals();
        aavePoolAddressesProvider = _aavePoolAddressesProvider;
    }

    function createContest(
        string memory name,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 endTime,
        address oracle
    ) external returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(maxParticipants > 1, "Need at least 2 participants");
        require(oracles[oracle], "Not an approved oracle");
        require(entryFee > 0, "Entry fee must be greater than 0");

        Contest contest = new Contest(
            name,
            entryFee,
            maxParticipants,
            endTime,
            paymentToken,
            oracle,
            platformFee,
            aavePoolAddressesProvider
        );

        contests.push(contest);
        emit ContestCreated(address(contest), msg.sender, entryFee);
        return address(contest);
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

    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    function getContests() external view returns (Contest[] memory) {
        return contests;
    }

    function collectPlatformFees() external onlyOwner {
        uint256 balance = IERC20(paymentToken).balanceOf(address(this));
        require(balance > 0, "No fees to collect");
        require(IERC20(paymentToken).transfer(owner(), balance), "Transfer failed");
    }
} 