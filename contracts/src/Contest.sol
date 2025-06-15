// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Contest is ReentrancyGuard {
    IERC20 public immutable paymentToken;
    uint8 public immutable paymentTokenDecimals;
    address public immutable oracle;
    uint256 public immutable platformFee; // in basis points

    enum ContestState { OPEN, CLOSED, SETTLED, CANCELLED }
    ContestState public state;

    struct ContestDetails {
        string name;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 endTime;
    }
    ContestDetails public details;

    mapping(address => bool) public hasEntered;
    address[] public participants;

    event ContestEntered(address indexed participant);
    event ContestLeft(address indexed participant);
    event EntryClosed();
    event PayoutsDistributed(uint256[] payouts);
    event ContestCancelled();
    event ParticipantRefunded(address indexed participant, uint256 amount);

    modifier whenOpen() {
        require(state == ContestState.OPEN, "Contest not open");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(
        string memory _name,
        uint256 _entryFee,
        uint256 _maxParticipants,
        uint256 _endTime,
        address _paymentToken,
        address _oracle,
        uint256 _platformFee
    ) {
        details = ContestDetails({
            name: _name,
            entryFee: _entryFee,
            maxParticipants: _maxParticipants,
            endTime: _endTime
        });
        paymentToken = IERC20(_paymentToken);
        paymentTokenDecimals = IERC20Metadata(_paymentToken).decimals();
        oracle = _oracle;
        platformFee = _platformFee;
        state = ContestState.OPEN;
    }

    function enter() external whenOpen {
        require(!hasEntered[msg.sender], "Already entered");
        require(participants.length < details.maxParticipants, "Contest full");

        paymentToken.transferFrom(msg.sender, address(this), details.entryFee);
        participants.push(msg.sender);
        hasEntered[msg.sender] = true;

        emit ContestEntered(msg.sender);
    }

    function leave() external whenOpen {
        require(hasEntered[msg.sender], "Not entered");

        paymentToken.transfer(msg.sender, details.entryFee);
        hasEntered[msg.sender] = false;

        // Remove participant from the participants array (swap and pop)
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == msg.sender) {
                participants[i] = participants[participants.length - 1];
                participants.pop();
                break;
            }
        }

        emit ContestLeft(msg.sender);
    }

    function closeEntry() external onlyOracle {
        require(state == ContestState.OPEN, "Contest not open");
        state = ContestState.CLOSED;
        emit EntryClosed();
    }

    function distribute(uint256[] calldata _payoutBasisPoints) external onlyOracle {
        require(state == ContestState.CLOSED, "Contest not closed");
        require(_payoutBasisPoints.length == participants.length, "Invalid payouts length");

        uint256 totalBasisPoints;
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            totalBasisPoints += _payoutBasisPoints[i];
        }
        require(totalBasisPoints == 10000, "Total must be 10000 basis points");

        // Calculate payouts based on basis points
        uint256 totalPot = paymentToken.balanceOf(address(this));
        uint256 platformFeeAmount = (totalPot * platformFee) / 10000;
        uint256 netPayout = totalPot - platformFeeAmount;

        uint256[] memory calculatedPayouts = new uint256[](_payoutBasisPoints.length);
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            calculatedPayouts[i] = (netPayout * _payoutBasisPoints[i]) / 10000;
        }

        // Update state 
        state = ContestState.SETTLED;
        emit PayoutsDistributed(calculatedPayouts);

        // External calls last
        paymentToken.transfer(oracle, platformFeeAmount);        
        for (uint256 i = 0; i < calculatedPayouts.length; i++) {
            paymentToken.transfer(participants[i], calculatedPayouts[i]);
        }
    }

    function emergencyWithdraw() external {
        require(hasEntered[msg.sender], "Not entered");
        require(block.timestamp > details.endTime, "Contest not ended");

        paymentToken.transfer(msg.sender, details.entryFee);
        hasEntered[msg.sender] = false;
    }

    function cancel() external onlyOracle {
        require(state == ContestState.OPEN, "Contest not open");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }

    function refundParticipants() external onlyOracle {
        require(state == ContestState.CANCELLED, "Contest not cancelled");
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (hasEntered[participant]) {
                paymentToken.transfer(participant, details.entryFee);
                hasEntered[participant] = false;
                emit ParticipantRefunded(participant, details.entryFee);
            }
        }
        delete participants;
    }
} 