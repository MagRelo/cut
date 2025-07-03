// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./Escrow.sol";

contract EscrowFactory is Ownable {
    mapping(address => bool) public oracles;
    Escrow[] public escrows;
    address public immutable paymentToken;
    address public immutable aavePoolAddressesProvider;

    event EscrowCreated(address indexed escrow, address indexed host, uint256 depositAmount);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);

    constructor(
        address _paymentToken,
        address _aavePoolAddressesProvider
    ) Ownable(msg.sender) {
        paymentToken = _paymentToken;
        aavePoolAddressesProvider = _aavePoolAddressesProvider;
    }

    function createEscrow(
        string memory name,
        uint256 depositAmount,
        uint256 maxParticipants,
        uint256 endTime,
        address oracle
    ) external returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(maxParticipants > 1, "Need at least 2 participants");
        require(oracles[oracle], "Not an approved oracle");
        require(depositAmount > 0, "Deposit amount must be greater than 0");

        Escrow escrow = new Escrow(
            name,
            depositAmount,
            maxParticipants,
            endTime,
            paymentToken,
            oracle,
            aavePoolAddressesProvider
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