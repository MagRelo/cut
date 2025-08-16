// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @author MagRelo
 * @dev Generic escrow contract for managing deposits and payouts
 * 
 * This contract implements a flexible escrow system where:
 * - Participants deposit a fixed amount of tokens
 * - An oracle determines the final payouts based on results
 * - Payouts are distributed according to basis points (10000 = 100%)
 * - Oracle receives a fee for their services
 * 
 * Key Features:
 * - Fixed deposit amounts per participant
 * - Oracle-controlled payout distribution
 * - Automatic fee collection for oracle
 * - Expiry-based refund mechanism
 * - Cancellation support
 * - Gas-optimized participant management
 * 
 * @custom:security This contract uses OpenZeppelin's ReentrancyGuard for security
 */
contract Escrow is ReentrancyGuard {
    /// @notice Maximum number of participants allowed (gas optimization for distribute function)
    uint256 public constant MAX_PARTICIPANTS = 2000;
    
    /// @notice The payment token used for deposits and payouts
    IERC20 public immutable paymentToken;
    
    /// @notice Decimal places of the payment token
    uint8 public immutable paymentTokenDecimals;
    
    /// @notice Address of the oracle that controls payouts and escrow state
    address public immutable oracle;
    
    /// @notice Oracle fee in basis points (e.g., 100 = 1%)
    uint256 public immutable oracleFee;
    
    /// @notice Escrow configuration details
    struct EscrowDetails {
        uint256 depositAmount; // Amount each participant must deposit
        uint256 expiry;        // Timestamp when escrow expires
    }
    
    /// @notice Current escrow configuration
    EscrowDetails public details;

    /// @notice Total amount of initial deposits collected
    uint256 public totalInitialDeposits;
    
    /// @notice Current state of the escrow
    enum EscrowState { OPEN, IN_PROGRESS, SETTLED, CANCELLED }
    EscrowState public state;

    /// @notice Mapping to track if an address has deposited
    mapping(address => bool) public hasDeposited;
    
    /// @notice Mapping to track participant index for O(1) removal
    mapping(address => uint256) public participantIndex;
    
    /// @notice Array of all participants (for iteration and payout distribution)
    address[] public participants;

    /// @notice Emitted when a participant deposits into the escrow
    /// @param participant The address of the participant who deposited
    event EscrowDeposited(address indexed participant);
    
    /// @notice Emitted when a participant withdraws from the escrow
    /// @param participant The address of the participant who withdrew
    event EscrowWithdrawn(address indexed participant);
    
    /// @notice Emitted when deposits are closed by the oracle
    event DepositsClosed();
    
    /// @notice Emitted when payouts are distributed
    /// @param payouts Array of payout amounts distributed to participants
    event PayoutsDistributed(uint256[] payouts);
    
    /// @notice Emitted when a participant withdraws after escrow expiry
    /// @param participant The address of the participant who withdrew
    /// @param amount The amount withdrawn
    event ExpiredEscrowWithdraw(address indexed participant, uint256 amount);
    
    /// @notice Emitted when the escrow is cancelled
    event EscrowCancelled();

    /// @notice Modifier to restrict functions to when escrow is open
    modifier whenOpen() {
        require(state == EscrowState.OPEN, "Escrow not open");
        _;
    }

    /// @notice Modifier to restrict functions to only the oracle
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

         /**
      * @notice Constructor initializes the escrow with configuration parameters
      * @dev Validates all parameters and sets up the escrow
     * @param _depositAmount The amount each participant must deposit
     * @param _expiry The timestamp when the escrow expires
     * @param _paymentToken The address of the payment token contract
     * @param _decimals The number of decimal places for the payment token
     * @param _oracle The address of the oracle that controls the escrow
     * @param _oracleFee The oracle fee in basis points (max 10000 = 100%)
     * 
     * Requirements:
     * - _depositAmount must be greater than 0
     * - _expiry must be in the future
     * - _paymentToken must not be the zero address
     * - _oracle must not be the zero address
     * - _oracleFee must not exceed 10000 (100%)
     */
    constructor(
        uint256 _depositAmount,
        uint256 _expiry,
        address _paymentToken,
        uint8 _decimals,
        address _oracle,
        uint256 _oracleFee
    ) {
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

         /**
      * @notice Allows a participant to deposit the required amount into the escrow
      * @dev Transfers tokens from participant to escrow and tracks participation
      * 
      * Requirements:
      * - Escrow must be in OPEN state
      * - Escrow must not be at maximum capacity
      * - Participant must have approved sufficient token allowance
      * 
      * Emits an {EscrowDeposited} event
      */
    function deposit() external whenOpen nonReentrant {
        require(participants.length < MAX_PARTICIPANTS, "Escrow full");

        paymentToken.transferFrom(msg.sender, address(this), details.depositAmount);
        
        // Track initial deposit
        totalInitialDeposits += details.depositAmount;
        
        participants.push(msg.sender);
        hasDeposited[msg.sender] = true;
        participantIndex[msg.sender] = participants.length - 1;

        emit EscrowDeposited(msg.sender);
    }

         /**
      * @notice Allows a participant to withdraw their deposit before the escrow proceeds
     * @dev Refunds the deposit amount and removes participant from tracking
     * 
     * Requirements:
     * - Escrow must be in OPEN state
     * - Participant must have deposited
     * 
     * Emits an {EscrowWithdrawn} event
     */
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

         /**
      * @notice Closes deposits and moves escrow to IN_PROGRESS state
      * @dev Only callable by the oracle when the escrow is ready to proceed
     * 
     * Requirements:
     * - Caller must be the oracle
     * - Escrow must be in OPEN state
     * 
     * Emits a {DepositsClosed} event
     */
    function closeDeposits() external whenOpen onlyOracle {
        state = EscrowState.IN_PROGRESS;
        emit DepositsClosed();
    }

         /**
      * @notice Distributes payouts to participants
      * @dev Only callable by the oracle
     * @param _payoutBasisPoints Array of basis points for each participant (10000 = 100%)
     * 
     * This function:
     * - Calculates oracle fee from total deposits
     * - Distributes remaining funds according to basis points
     * - Transfers any remaining dust amounts to oracle
     * 
     * Requirements:
     * - Caller must be the oracle
     * - Escrow must be in IN_PROGRESS state
     * - _payoutBasisPoints length must match participant count
     * - Total basis points must equal 10000 (100%)
     * 
     * Emits a {PayoutsDistributed} event
     */
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

    /**
     * @notice Cancels the escrow and refunds all participants
     * @dev Only callable by the oracle in emergency situations
     * 
     * This function:
     * - Refunds all participants their original deposit
     * - Clears all participant tracking
     * - Moves escrow to CANCELLED state
     * 
     * Requirements:
     * - Caller must be the oracle
     * - Escrow must be in OPEN or IN_PROGRESS state
     * 
     * Emits an {EscrowCancelled} event
     */
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

    /**
     * @notice Allows participants to withdraw their deposit after escrow expiry
     * @dev Can be called by any participant after the expiry timestamp
     * 
     * Requirements:
     * - Participant must have deposited
     * - Current timestamp must be after expiry
     * 
     * Emits an {ExpiredEscrowWithdraw} event
     */
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

    /**
     * @notice Gets the current number of participants in the escrow
     * @return The number of participants who have deposited
     */
    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }
} 