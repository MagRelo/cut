// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Escrow is ReentrancyGuard, Ownable {
    uint256 public constant MAX_PARTICIPANTS = 2000; // max implemented for gas considerations on distribute() function
    
    IERC20 public immutable paymentToken;
    uint8 public immutable paymentTokenDecimals;
    address public immutable oracle;
    uint256 public immutable oracleFee; // Basis points (e.g., 100 = 1%)
    struct EscrowDetails {
        uint256 depositAmount;
        uint256 expiry;
    }
    EscrowDetails public details;

    // State variables
    uint256 public totalInitialDeposits;
    enum EscrowState { OPEN, IN_PROGRESS, SETTLED, CANCELLED }
    EscrowState public state;

    // Participant tracking
    mapping(address => bool) public hasDeposited;
    mapping(address => uint256) public participantIndex; // Track participant index for O(1) removal
    address[] public participants;

    // Events
    event EscrowDeposited(address indexed participant);
    event EscrowWithdrawn(address indexed participant);
    event DepositsClosed();
    event PayoutsDistributed(uint256[] payouts);
    event ExpiredEscrowWithdraw(address indexed participant, uint256 amount);
    event EscrowCancelled();

    // Modifiers
    modifier whenOpen() {
        require(state == EscrowState.OPEN, "Escrow not open");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(
        uint256 _depositAmount,
        uint256 _expiry,
        address _paymentToken,
        uint8 _decimals,
        address _oracle,
        uint256 _oracleFee
    ) Ownable(msg.sender) {
        require(_depositAmount > 0, "Deposit amount must be greater than 0");
        require(_expiry > block.timestamp, "Expiry must be in the future");
        require(_paymentToken != address(0), "Payment token cannot be zero address");
        require(_oracle != address(0), "Oracle cannot be zero address");
        require(_oracleFee <= 10000, "Oracle fee cannot exceed 100%");
        
        details = EscrowDetails({
            depositAmount: _depositAmount,
            expiry: _expiry
        });
        paymentToken = IERC20(_paymentToken);
        paymentTokenDecimals = _decimals;
        oracle = _oracle;
        oracleFee = _oracleFee;
        state = EscrowState.OPEN;
    }

    function deposit() external whenOpen nonReentrant {
        require(!hasDeposited[msg.sender], "Already deposited");
        require(participants.length < MAX_PARTICIPANTS, "Escrow full");

        paymentToken.transferFrom(msg.sender, address(this), details.depositAmount);
        
        // Track initial deposit
        totalInitialDeposits += details.depositAmount;
        
        participants.push(msg.sender);
        hasDeposited[msg.sender] = true;
        participantIndex[msg.sender] = participants.length - 1;

        emit EscrowDeposited(msg.sender);
    }

    function withdraw() external whenOpen nonReentrant {
        require(hasDeposited[msg.sender], "Not deposited");

        // Update participant state
        totalInitialDeposits -= details.depositAmount;
        hasDeposited[msg.sender] = false;
        uint256 lastIndex = participants.length - 1;
        if (lastIndex > participantIndex[msg.sender]) {
            address lastParticipant = participants[lastIndex];
            participants[participantIndex[msg.sender]] = lastParticipant;
            participantIndex[lastParticipant] = participantIndex[msg.sender];
        }
        participants.pop();
        delete participantIndex[msg.sender];

        // Refund deposit amount
        paymentToken.transfer(msg.sender, details.depositAmount);

        emit EscrowWithdrawn(msg.sender);
    }

    function closeDeposits() external whenOpen onlyOracle {
        state = EscrowState.IN_PROGRESS;
        emit DepositsClosed();
    }

    function distribute(uint256[] calldata _payoutBasisPoints) external onlyOracle nonReentrant {
        require(state == EscrowState.IN_PROGRESS, "Escrow not in progress");
        require(_payoutBasisPoints.length == participants.length, "Invalid payouts length");

        uint256 totalBasisPoints;
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            totalBasisPoints += _payoutBasisPoints[i];
        }
        require(totalBasisPoints == 10000, "Total must be 10000 basis points");

        // Calculate oracle fee
        uint256 oracleFeeAmount = (totalInitialDeposits * oracleFee) / 10000;
        uint256 remainingForParticipants = totalInitialDeposits - oracleFeeAmount;

        // Calculate payouts based on basis points from remaining amount after oracle fee
        uint256[] memory calculatedPayouts = new uint256[](_payoutBasisPoints.length);
        uint256 totalCalculatedPayouts = 0;
        
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            // Use higher precision intermediate calculation to avoid precision loss
            uint256 payout = (remainingForParticipants * _payoutBasisPoints[i]) / 10000;
            calculatedPayouts[i] = payout;
            totalCalculatedPayouts += payout;
        }

        // Update state 
        state = EscrowState.SETTLED;
        emit PayoutsDistributed(calculatedPayouts);

        // External calls last
        for (uint256 i = 0; i < calculatedPayouts.length; i++) {
            paymentToken.transfer(participants[i], calculatedPayouts[i]);
        }

        // Transfer oracle fee and any remaining funds to oracle, including dust amounts
        uint256 remainingBalance = paymentToken.balanceOf(address(this));
        if (remainingBalance > 0) {
            paymentToken.transfer(oracle, remainingBalance);
        }
    }

    function cancelAndRefund() external onlyOracle {
        require(state == EscrowState.OPEN || state == EscrowState.IN_PROGRESS, "Escrow not in cancellable state");
        
        // Refund all participants
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (hasDeposited[participant]) {
                paymentToken.transfer(participant, details.depositAmount);
                hasDeposited[participant] = false;
            }
        }
        
        // Clear state
        totalInitialDeposits = 0;
        delete participants;
        
        // Update state
        state = EscrowState.CANCELLED;
        
        emit EscrowCancelled();
    }

    function expiredEscrowWithdraw() external nonReentrant {
        require(hasDeposited[msg.sender], "Not deposited");
        require(block.timestamp > details.expiry, "Escrow not ended");

        // Update participant state
        totalInitialDeposits -= details.depositAmount;
        hasDeposited[msg.sender] = false;
        uint256 lastIndex = participants.length - 1;
        if (lastIndex > participantIndex[msg.sender]) {
            address lastParticipant = participants[lastIndex];
            participants[participantIndex[msg.sender]] = lastParticipant;
            participantIndex[lastParticipant] = participantIndex[msg.sender];
        }
        participants.pop();
        delete participantIndex[msg.sender];

        // Refund deposit amount
        paymentToken.transfer(msg.sender, details.depositAmount);

        emit ExpiredEscrowWithdraw(msg.sender, details.depositAmount);
    }

    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

} 