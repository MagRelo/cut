// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Escrow.sol";

contract EscrowFactory is Ownable {
    Escrow[] public escrows;
    address public paymentToken;
    uint8 public paymentTokenDecimals;

    event EscrowCreated(address indexed escrow, address indexed host, uint256 depositAmount);
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken, uint8 decimals);

    constructor(
        address _paymentToken,
        uint8 _decimals
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token address");
        paymentToken = _paymentToken;
        paymentTokenDecimals = _decimals;
    }

    function setPaymentToken(address _newPaymentToken, uint8 _decimals) external onlyOwner {
        require(_newPaymentToken != address(0), "Invalid payment token address");
        address oldToken = paymentToken;
        paymentToken = _newPaymentToken;
        paymentTokenDecimals = _decimals;
        emit PaymentTokenUpdated(oldToken, _newPaymentToken, _decimals);
    }

    function createEscrow(
        uint256 depositAmount,
        uint256 expiry,
        address oracle,
        uint256 oracleFee
    ) external returns (address) {
        require(expiry > block.timestamp, "Expiry must be in future");
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

    function getEscrows() external view returns (Escrow[] memory) {
        return escrows;
    }
} 