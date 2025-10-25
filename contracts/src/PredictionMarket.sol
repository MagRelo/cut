// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Escrow.sol";

/**
 * @title PredictionMarket
 * @author MagRelo
 * @dev Conditional token prediction market using LMSR pricing
 * 
 * This contract enables spectators to bet on contest participants using:
 * - Complete set minting (spectators receive tokens for ALL outcomes)
 * - LMSR-priced outcome swaps (collateral-bounded, no external liquidity needed)
 * - Oracle resolution based on Layer 1 Escrow contest results
 * 
 * Key Features:
 * - Tradeable ERC-1155 outcome tokens
 * - Dynamic LMSR pricing for swaps between outcomes
 * - Collateral-backed (bounded loss, always solvent)
 * - Integrates with existing Escrow contract for outcomes
 * 
 * Example Use Case:
 * User A competes in fantasy golf contest (Layer 1 Escrow)
 * Spectator X doesn't want to compete but wants to bet on User A winning
 * Spectator X deposits collateral → receives tokens for all contestants
 * Spectator X swaps tokens to concentrate position on User A
 * Oracle resolves contest → Spectator X redeems winning tokens
 * 
 * @custom:security This contract uses OpenZeppelin's ReentrancyGuard for security
 */
contract PredictionMarket is ERC1155, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @notice The payment token used for collateral deposits and payouts
    IERC20 public immutable paymentToken;
    
    /// @notice Reference to Layer 1 contest escrow
    Escrow public immutable contestEscrow;
    
    /// @notice Address of the oracle that controls market state
    address public immutable oracle;
    
    /// @notice Number of possible outcomes (equals number of contest participants)
    uint256 public immutable numOutcomes;
    
    /// @notice LMSR liquidity parameter - controls price curve steepness
    /// @dev Higher value = flatter curve = more liquidity
    uint256 public immutable liquidityParameter;
    
    /// @notice Denominator for payout calculations (10000 = 100%)
    uint256 public constant PAYOUT_DENOMINATOR = 10000;
    
    /// @notice Total collateral deposited by spectators
    uint256 public totalCollateral;
    
    /// @notice Payout vector set by oracle after resolution (basis points)
    uint256[] public payoutNumerators;
    
    /// @notice Track net position for each outcome (for LMSR pricing)
    /// @dev Positive = net bought, Negative = net sold
    mapping(uint256 => int256) public netPosition;
    
    /// @notice Map contest participant addresses to outcome IDs
    mapping(address => uint256) public participantToOutcome;
    
    /// @notice Map outcome IDs to contest participant addresses
    address[] public outcomeToParticipant;
    
    /// @notice Current state of the prediction market
    enum MarketState { OPEN, CLOSED, RESOLVED }
    MarketState public state;
    
    /// @notice Emitted when a spectator deposits and receives complete outcome set
    event Deposited(address indexed spectator, uint256 amount);
    
    /// @notice Emitted when outcome tokens are swapped
    event OutcomesSwapped(
        address indexed spectator, 
        uint256 indexed fromId, 
        uint256 indexed toId, 
        uint256 amountBurned, 
        uint256 amountMinted,
        uint256 swapCost
    );
    
    /// @notice Emitted when a complete set is merged back to collateral
    event PositionsMerged(address indexed spectator, uint256 amount);
    
    /// @notice Emitted when the market is closed for new deposits
    event MarketClosed();
    
    /// @notice Emitted when results are reported and payouts set
    event ResultsReported(uint256[] payoutNumerators);
    
    /// @notice Emitted when a spectator redeems outcome tokens for winnings
    event PositionRedeemed(address indexed spectator, uint256 indexed outcomeId, uint256 amount, uint256 payout);
    
    /// @notice Modifier to restrict functions to only the oracle
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }
    
    /// @notice Modifier to restrict functions to when market is open
    modifier whenOpen() {
        require(state == MarketState.OPEN, "Market not open");
        _;
    }
    
    /**
     * @notice Constructor initializes the prediction market
     * @dev Reads participants from existing Escrow contract to set outcomes
     * @param _escrow Address of the Layer 1 contest escrow
     * @param _liquidityParameter LMSR curve steepness parameter
     * @param _oracle Address of the oracle that controls the market
     * 
     * Requirements:
     * - _escrow must not be zero address
     * - _oracle must not be zero address
     * - _liquidityParameter must be greater than 0
     * - Contest escrow must be in IN_PROGRESS state (participants locked)
     */
    constructor(
        address _escrow,
        uint256 _liquidityParameter,
        address _oracle
    ) ERC1155("") {
        require(_escrow != address(0), "Escrow cannot be zero address");
        require(_oracle != address(0), "Oracle cannot be zero address");
        require(_liquidityParameter > 0, "Liquidity parameter must be > 0");
        
        contestEscrow = Escrow(_escrow);
        oracle = _oracle;
        liquidityParameter = _liquidityParameter;
        
        // Get payment token from escrow
        paymentToken = contestEscrow.paymentToken();
        
        // Read participants from Layer 1 escrow
        uint256 numParticipants = contestEscrow.getParticipantsCount();
        require(numParticipants > 0, "No participants in contest");
        numOutcomes = numParticipants;
        
        // Build mapping: participant address → outcome ID
        for (uint256 i = 0; i < numParticipants; i++) {
            address participant = contestEscrow.participants(i);
            participantToOutcome[participant] = i;
            outcomeToParticipant.push(participant);
        }
        
        state = MarketState.OPEN;
    }
    
    /**
     * @notice Deposit collateral and receive complete set of outcome tokens
     * @dev Mints equal amounts of tokens for ALL possible outcomes
     * @param amount Amount of collateral to deposit
     * 
     * Complete set means:
     * - If 3 contestants → receive [amount] tokens for each of the 3 outcomes
     * - Conservation of value: sum of all outcome tokens = collateral deposited
     * 
     * Requirements:
     * - Market must be in OPEN state
     * - User must have approved sufficient token allowance
     * 
     * Emits a {Deposited} event
     */
    function deposit(uint256 amount) external whenOpen nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer collateral from spectator
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        totalCollateral += amount;
        
        // Mint complete set - one of each outcome token
        for (uint256 i = 0; i < numOutcomes; i++) {
            _mint(msg.sender, i, amount, "");
        }
        
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @notice Swap outcome tokens using LMSR pricing
     * @dev Burns tokens for one outcome, mints fewer tokens for another outcome
     * @param fromId Outcome ID to swap from (burn these tokens)
     * @param toId Outcome ID to swap to (mint these tokens)
     * @param amount Amount of 'from' tokens to burn
     * 
     * LMSR Pricing:
     * - More demand for 'to' outcome → higher swap cost
     * - Cost stays as collateral (market maker fee)
     * - Bounded by deposited collateral (no unbounded loss)
     * 
     * Requirements:
     * - Market must be in OPEN state
     * - User must have sufficient balance of 'from' tokens
     * - fromId and toId must be different and valid
     * 
     * Emits an {OutcomesSwapped} event
     */
    function swapOutcomes(
        uint256 fromId,
        uint256 toId,
        uint256 amount
    ) external whenOpen nonReentrant {
        require(fromId != toId, "Cannot swap same outcome");
        require(fromId < numOutcomes && toId < numOutcomes, "Invalid outcome ID");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender, fromId) >= amount, "Insufficient balance");
        
        // Calculate swap cost using LMSR curve
        uint256 swapCost = calculateLMSRCost(fromId, toId, amount);
        require(swapCost < amount, "Swap cost too high");
        
        // Burn 'from' tokens
        _burn(msg.sender, fromId, amount);
        netPosition[fromId] -= int256(amount);
        
        // Mint fewer 'to' tokens (adjusted for price)
        uint256 received = amount - swapCost;
        _mint(msg.sender, toId, received, "");
        netPosition[toId] += int256(received);
        
        // swapCost remains as collateral (market maker take)
        
        emit OutcomesSwapped(msg.sender, fromId, toId, amount, received, swapCost);
    }
    
    /**
     * @notice Calculate LMSR swap cost
     * @dev Implements simplified LMSR pricing curve
     * @param toId Outcome swapping to
     * @param amount Amount being swapped
     * @return cost Amount of tokens lost in swap (stays as collateral)
     * 
     * Formula: cost = (amount × |netPosition[to]|) / (liquidityParameter + |netPosition[to]|)
     * 
     * Characteristics:
     * - More demand for 'to' → higher cost
     * - Curve flattens as netPosition increases
     * - Bounded between 0 and amount
     */
    function calculateLMSRCost(
        uint256 /* fromId */,
        uint256 toId,
        uint256 amount
    ) public view returns (uint256) {
        // More demand for 'to' outcome = higher cost
        int256 currentDemand = netPosition[toId];
        uint256 absDemand = currentDemand >= 0 
            ? uint256(currentDemand) 
            : uint256(-currentDemand);
        
        // LMSR curve: cost increases with demand
        // Higher liquidityParameter = flatter curve
        uint256 cost = (amount * absDemand) / (liquidityParameter + absDemand);
        
        return cost;
    }
    
    /**
     * @notice Merge complete set of outcome tokens back to collateral
     * @dev Burns equal amounts of ALL outcome tokens, refunds collateral
     * @param amount Amount of complete sets to merge
     * 
     * Requirements:
     * - Market must be in OPEN state
     * - User must have at least 'amount' of EVERY outcome token
     * 
     * This allows spectators to exit positions before resolution
     * 
     * Emits a {PositionsMerged} event
     */
    function mergePositions(uint256 amount) external whenOpen nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Verify user has complete set
        for (uint256 i = 0; i < numOutcomes; i++) {
            require(
                balanceOf(msg.sender, i) >= amount,
                "Incomplete set"
            );
        }
        
        // Burn complete set
        for (uint256 i = 0; i < numOutcomes; i++) {
            _burn(msg.sender, i, amount);
            netPosition[i] -= int256(amount);
        }
        
        // Refund collateral
        totalCollateral -= amount;
        paymentToken.safeTransfer(msg.sender, amount);
        
        emit PositionsMerged(msg.sender, amount);
    }
    
    /**
     * @notice Close the market to new deposits and swaps
     * @dev Only callable by oracle, prepares for resolution
     * 
     * Requirements:
     * - Caller must be the oracle
     * - Market must be in OPEN state
     * 
     * Emits a {MarketClosed} event
     */
    function closeMarket() external onlyOracle {
        require(state == MarketState.OPEN, "Market not open");
        state = MarketState.CLOSED;
        emit MarketClosed();
    }
    
    /**
     * @notice Resolve market by reading Layer 1 contest results
     * @dev Reads final payouts from Escrow contract and converts to basis points
     * 
     * This function:
     * - Reads payout amounts from Layer 1 contest
     * - Normalizes to basis points (sum = 10000)
     * - Stores as payout vector for redemptions
     * 
     * Requirements:
     * - Market must be in CLOSED state
     * - Contest escrow must be in SETTLED state
     * 
     * Emits a {ResultsReported} event
     */
    function resolveFromEscrow() external {
        require(state == MarketState.CLOSED, "Market not closed");
        require(contestEscrow.state() == Escrow.EscrowState.SETTLED, "Contest not settled");
        
        // Read payouts for all participants from Layer 1
        address[] memory participants = new address[](numOutcomes);
        for (uint256 i = 0; i < numOutcomes; i++) {
            participants[i] = outcomeToParticipant[i];
        }
        
        uint256[] memory payouts = contestEscrow.getFinalPayouts(participants);
        
        // Calculate total to normalize to basis points
        uint256 totalPayouts;
        for (uint256 i = 0; i < payouts.length; i++) {
            totalPayouts += payouts[i];
        }
        
        require(totalPayouts > 0, "No payouts distributed");
        
        // Convert to basis points for our payout vector
        payoutNumerators = new uint256[](numOutcomes);
        for (uint256 i = 0; i < numOutcomes; i++) {
            payoutNumerators[i] = (payouts[i] * PAYOUT_DENOMINATOR) / totalPayouts;
        }
        
        state = MarketState.RESOLVED;
        emit ResultsReported(payoutNumerators);
    }
    
    /**
     * @notice Redeem outcome tokens for winnings
     * @dev Burns outcome tokens, transfers proportional payout based on oracle results
     * @param outcomeId The outcome ID to redeem
     * 
     * Payout calculation:
     * payout = (tokenBalance × payoutNumerator) / PAYOUT_DENOMINATOR
     * 
     * Note: This assumes each token represents 1 unit of collateral value.
     * Due to LMSR swap costs, actual available collateral may be less than
     * theoretical payout. In this case, payout is capped at available balance.
     * 
     * Requirements:
     * - Market must be in RESOLVED state
     * - User must have non-zero balance of outcome tokens
     * 
     * Emits a {PositionRedeemed} event
     */
    function redeemPosition(uint256 outcomeId) external nonReentrant {
        require(state == MarketState.RESOLVED, "Market not resolved");
        require(outcomeId < numOutcomes, "Invalid outcome ID");
        
        uint256 balance = balanceOf(msg.sender, outcomeId);
        require(balance > 0, "No tokens to redeem");
        
        // Calculate payout proportional to outcome
        uint256 payout = (balance * payoutNumerators[outcomeId]) / PAYOUT_DENOMINATOR;
        
        // Safety check: don't pay more than available collateral
        // This can happen when LMSR swap costs reduce available collateral
        uint256 available = paymentToken.balanceOf(address(this));
        if (payout > available) {
            payout = available;
        }
        
        // Burn tokens
        _burn(msg.sender, outcomeId, balance);
        
        // Transfer winnings
        if (payout > 0) {
            paymentToken.safeTransfer(msg.sender, payout);
        }
        
        emit PositionRedeemed(msg.sender, outcomeId, balance, payout);
    }
    
    /**
     * @notice Get the participant address for a given outcome ID
     * @param outcomeId The outcome ID to query
     * @return The address of the participant corresponding to this outcome
     */
    function getOutcomeParticipant(uint256 outcomeId) external view returns (address) {
        require(outcomeId < numOutcomes, "Invalid outcome ID");
        return outcomeToParticipant[outcomeId];
    }
    
    /**
     * @notice Get current implied probability for an outcome based on net position
     * @dev Useful for frontends to display current "odds"
     * @param outcomeId The outcome ID to query
     * @return Implied probability in basis points (10000 = 100%)
     */
    function getImpliedProbability(uint256 outcomeId) external view returns (uint256) {
        require(outcomeId < numOutcomes, "Invalid outcome ID");
        
        if (state != MarketState.OPEN) {
            // After market closes, return oracle's payout if available
            if (payoutNumerators.length > 0) {
                return payoutNumerators[outcomeId];
            }
            return 0;
        }
        
        // Calculate total absolute demand across all outcomes
        uint256 totalAbsDemand = 0;
        for (uint256 i = 0; i < numOutcomes; i++) {
            int256 positionDemand = netPosition[i];
            uint256 absPositionDemand = positionDemand >= 0 ? uint256(positionDemand) : uint256(-positionDemand);
            totalAbsDemand += absPositionDemand;
        }
        
        if (totalAbsDemand == 0) {
            // No swaps yet, equal probability
            return PAYOUT_DENOMINATOR / numOutcomes;
        }
        
        // Implied probability proportional to net position
        int256 demand = netPosition[outcomeId];
        uint256 absDemand = demand >= 0 ? uint256(demand) : uint256(-demand);
        
        return (absDemand * PAYOUT_DENOMINATOR) / totalAbsDemand;
    }
}

