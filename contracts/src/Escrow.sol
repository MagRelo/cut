// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Escrow is ReentrancyGuard, Ownable {
    uint256 public constant MAX_PARTICIPANTS = 2000;
    
    IERC20 public immutable platformToken;
    address public immutable oracle;

    uint256 public totalInitialDeposits;

    enum EscrowState { OPEN, IN_PROGRESS, SETTLED, CANCELLED }
    EscrowState public state;

    struct EscrowDetails {
        string name;
        uint256 depositAmount;
        uint256 endTime;
    }
    EscrowDetails public details;

    mapping(address => bool) public hasDeposited;
    mapping(address => uint256) public participantIndex; // Track participant index for O(1) removal
    address[] public participants;

    event EscrowDeposited(address indexed participant);
    event EscrowWithdrawn(address indexed participant);
    event DepositsClosed();
    event PayoutsDistributed(uint256[] payouts);
    event EmergencyWithdrawn(address indexed participant, uint256 amount);
    event EscrowCancelled();

    modifier whenOpen() {
        require(state == EscrowState.OPEN, "Escrow not open");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(
        string memory _name,
        uint256 _depositAmount,
        uint256 _endTime,
        address _platformToken,
        address _oracle
    ) Ownable(msg.sender) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_depositAmount > 0, "Deposit amount must be greater than 0");
        require(_endTime > block.timestamp, "End time must be in the future");
        require(_platformToken != address(0), "Platform token cannot be zero address");
        require(_oracle != address(0), "Oracle cannot be zero address");
        
        details = EscrowDetails({
            name: _name,
            depositAmount: _depositAmount,
            endTime: _endTime
        });
        platformToken = IERC20(_platformToken);
        oracle = _oracle;
        state = EscrowState.OPEN;
    }

    function deposit() external whenOpen nonReentrant {
        require(!hasDeposited[msg.sender], "Already deposited");
        require(participants.length < MAX_PARTICIPANTS, "Escrow full");

        platformToken.transferFrom(msg.sender, address(this), details.depositAmount);
        
        // Track initial deposit
        totalInitialDeposits += details.depositAmount;
        
        participants.push(msg.sender);
        hasDeposited[msg.sender] = true;
        participantIndex[msg.sender] = participants.length - 1;

        emit EscrowDeposited(msg.sender);
    }

    function withdraw() external whenOpen nonReentrant {
        require(hasDeposited[msg.sender], "Not deposited");

        // Store the deposit amount before state changes
        uint256 depositAmount = details.depositAmount;
        
        // Update state BEFORE external calls (checks-effects-interactions pattern)
        totalInitialDeposits -= depositAmount;
        hasDeposited[msg.sender] = false;
        uint256 lastIndex = participants.length - 1;
        if (lastIndex > participantIndex[msg.sender]) {
            address lastParticipant = participants[lastIndex];
            participants[participantIndex[msg.sender]] = lastParticipant;
            participantIndex[lastParticipant] = participantIndex[msg.sender];
        }
        participants.pop();
        delete participantIndex[msg.sender];

        // External call LAST (interactions)
        platformToken.transfer(msg.sender, depositAmount);

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

        // Calculate payouts based on basis points from initial deposits only
        uint256[] memory calculatedPayouts = new uint256[](_payoutBasisPoints.length);
        uint256 totalCalculatedPayouts = 0;
        
        for (uint256 i = 0; i < _payoutBasisPoints.length; i++) {
            // Use higher precision intermediate calculation to avoid precision loss
            uint256 payout = (totalInitialDeposits * _payoutBasisPoints[i]) / 10000;
            calculatedPayouts[i] = payout;
            totalCalculatedPayouts += payout;
        }
        
        // Handle any dust amounts due to rounding by adding to the last participant
        if (totalCalculatedPayouts < totalInitialDeposits && calculatedPayouts.length > 0) {
            uint256 dust = totalInitialDeposits - totalCalculatedPayouts;
            calculatedPayouts[calculatedPayouts.length - 1] += dust;
        }

        // Update state 
        state = EscrowState.SETTLED;
        emit PayoutsDistributed(calculatedPayouts);

        // External calls last
        for (uint256 i = 0; i < calculatedPayouts.length; i++) {
            platformToken.transfer(participants[i], calculatedPayouts[i]);
        }

        // Transfer any remaining funds to oracle (should be zero)
        uint256 remainingBalance = platformToken.balanceOf(address(this));
        if (remainingBalance > 0) {
            platformToken.transfer(oracle, remainingBalance);
        }
    }

    function emergencyWithdraw() external nonReentrant {
        require(hasDeposited[msg.sender], "Not deposited");
        require(block.timestamp > details.endTime, "Escrow not ended");
        require(state == EscrowState.OPEN, "Escrow not in emergency state");

        // Store the deposit amount before state changes
        uint256 depositAmount = details.depositAmount;
        
        // Update state BEFORE external calls (checks-effects-interactions pattern)
        totalInitialDeposits -= depositAmount;
        hasDeposited[msg.sender] = false;
        uint256 lastIndex = participants.length - 1;
        if (lastIndex > participantIndex[msg.sender]) {
            address lastParticipant = participants[lastIndex];
            participants[participantIndex[msg.sender]] = lastParticipant;
            participantIndex[lastParticipant] = participantIndex[msg.sender];
        }
        participants.pop();
        delete participantIndex[msg.sender];

        // External call LAST (interactions)
        platformToken.transfer(msg.sender, depositAmount);

        emit EmergencyWithdrawn(msg.sender, depositAmount);
    }

    function cancelAndRefund() external onlyOwner {
        require(state == EscrowState.OPEN, "Escrow not open");
        
        // Refund all participants
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (hasDeposited[participant]) {
                platformToken.transfer(participant, details.depositAmount);
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

    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

} 