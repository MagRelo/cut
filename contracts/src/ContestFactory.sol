// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./Contest.sol";

contract ContestFactory is Ownable {
    mapping(address => bool) public oracles;
    Contest[] public contests;
    address public immutable paymentToken;
    address public immutable aavePoolAddressesProvider;

    event ContestCreated(address indexed contest, address indexed host, uint256 entryFee);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);

    constructor(
        address _paymentToken,
        address _aavePoolAddressesProvider
    ) Ownable(msg.sender) {
        paymentToken = _paymentToken;
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

    function getContests() external view returns (Contest[] memory) {
        return contests;
    }
} 