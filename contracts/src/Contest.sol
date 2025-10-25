// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Contest
 * @author MagRelo
 * @dev Combined contest and prediction market contract
 * 
 * This contract merges Escrow (Layer 1) and PredictionMarket (Layer 2) into a single contract:
 * 
 * Layer 1 (Contestants):
 * - Contestants deposit fixed amount to enter
 * - Oracle distributes prizes based on results
 * - Winners claim their payouts
 * 
 * Layer 2 (Spectators):
 * - Spectators bet on contestants using LMSR pricing
 * - 15% entry fee augments Layer 1 prizes and pays contestant bonuses
 * - Winner-take-all redemption based on Layer 1 results
 * - Can withdraw before settlement (full refund with deferred fees)
 * 
 * Key Innovation: ONE oracle call (`distribute()`) settles both layers!
 */
contract Contest is ERC1155, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @notice The payment token used for deposits and payouts
    IERC20 public immutable paymentToken;
    
    /// @notice Address of the oracle that controls contest state
    address public immutable oracle;
    
    /// @notice Fixed deposit amount for contestants
    uint256 public immutable contestantDepositAmount;
    
    /// @notice Oracle fee in basis points (e.g., 100 = 1%)
    uint256 public immutable oracleFeeBps;
    
    /// @notice Timestamp when contest expires (for refunds)
    uint256 public immutable expiryTimestamp;
    
    /// @notice LMSR liquidity parameter - controls price curve steepness
    uint256 public immutable liquidityParameter;
    
    /// @notice Demand sensitivity in basis points - controls LMSR price curve steepness
    uint256 public immutable demandSensitivityBps;
    
    /// @notice Entry fee for spectators in basis points (e.g., 1500 = 15%)
    uint256 public constant SPECTATOR_ENTRY_FEE_BPS = 1500;
    
    /// @notice Denominator for basis point calculations
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Price precision for LMSR calculations
    uint256 public constant PRICE_PRECISION = 1e6;
    
    /// @notice Current state of the contest
    enum ContestState { OPEN, IN_PROGRESS, SETTLED, CANCELLED }
    ContestState public state;
    
    /// @notice Flag to control betting availability during IN_PROGRESS
    /// @dev Oracle can close betting before contest ends to prevent last-second bets
    bool public bettingOpen;
    
    // ============ Layer 1: Contestant Data ============
    
    /// @notice Array of contestant addresses
    address[] public contestants;
    
    /// @notice Mapping to check if address is a contestant
    mapping(address => bool) public isContestant;
    
    /// @notice Total contestant deposits collected
    uint256 public totalContestantDeposits;
    
    /// @notice Final payouts for each contestant after settlement
    mapping(address => uint256) public finalContestantPayouts;
    
    // ============ Layer 2: Spectator Data ============
    
    /// @notice Track net position for each outcome (for LMSR pricing and total supply)
    mapping(uint256 => int256) public netPosition;
    
    /// @notice Total collateral from spectators (85% of deposits)
    uint256 public totalSpectatorCollateral;
    
    /// @notice Accumulated prize bonus to augment Layer 1 pool
    uint256 public accumulatedPrizeBonus;
    
    /// @notice Bonuses earned by each contestant from betting volume
    mapping(address => uint256) public contestantBonuses;
    
    /// @notice Total betting volume on each contestant (for transparency)
    mapping(address => uint256) public totalVolumeOnContestant;
    
    /// @notice Track total payment tokens deposited by each spectator (for withdrawals)
    mapping(address => uint256) public spectatorTotalDeposited;
    
    /// @notice Winning outcome ID after settlement (for winner-take-all)
    uint256 public spectatorWinningOutcome;
    
    /// @notice Flag indicating if spectator market has been resolved
    bool public spectatorMarketResolved;
    
    // ============ Events ============
    
    event ContestantDeposited(address indexed contestant);
    event ContestStarted();
    event BettingClosed();
    event SpectatorDeposited(address indexed spectator, uint256 indexed outcomeId, uint256 amount, uint256 tokensReceived);
    event SpectatorWithdrew(address indexed spectator, uint256 amount);
    event ContestSettled(address[] winners, uint256[] payouts);
    event ContestantPayoutClaimed(address indexed contestant, uint256 amount);
    event SpectatorPayoutRedeemed(address indexed spectator, uint256 indexed outcomeId, uint256 payout);
    event ContestCancelled();
    
    /// @notice Modifier to restrict functions to only the oracle
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }
    
    /**
     * @notice Constructor initializes the contest
     * @param _paymentToken ERC20 token used for deposits and payouts
     * @param _oracle Address that controls contest lifecycle
     * @param _contestantDepositAmount Fixed amount each contestant must deposit
     * @param _oracleFeeBps Oracle fee as basis points
     * @param _expiryTimestamp When contest expires (for refunds)
     * @param _liquidityParameter LMSR curve parameter
     * @param _demandSensitivityBps LMSR price sensitivity parameter
     */
    constructor(
        address _paymentToken,
        address _oracle,
        uint256 _contestantDepositAmount,
        uint256 _oracleFeeBps,
        uint256 _expiryTimestamp,
        uint256 _liquidityParameter,
        uint256 _demandSensitivityBps
    ) ERC1155("") {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_oracle != address(0), "Invalid oracle");
        require(_contestantDepositAmount > 0, "Invalid deposit amount");
        require(_oracleFeeBps <= 1000, "Oracle fee too high"); // Max 10%
        require(_expiryTimestamp > block.timestamp, "Expiry in past");
        require(_liquidityParameter > 0, "Invalid liquidity parameter");
        require(_demandSensitivityBps <= BPS_DENOMINATOR, "Invalid demand sensitivity");
        
        paymentToken = IERC20(_paymentToken);
        oracle = _oracle;
        contestantDepositAmount = _contestantDepositAmount;
        oracleFeeBps = _oracleFeeBps;
        expiryTimestamp = _expiryTimestamp;
        liquidityParameter = _liquidityParameter;
        demandSensitivityBps = _demandSensitivityBps;
        
        state = ContestState.OPEN;
    }
    
    // ============ Layer 1: Contestant Functions ============
    
    /**
     * @notice Contestant joins the contest by depositing required amount
     * @dev Must deposit exact contestantDepositAmount
     */
    function joinContest() external nonReentrant {
        require(state == ContestState.OPEN, "Contest not open");
        require(!isContestant[msg.sender], "Already deposited");
        require(block.timestamp < expiryTimestamp, "Contest expired");
        
        contestants.push(msg.sender);
        isContestant[msg.sender] = true;
        totalContestantDeposits += contestantDepositAmount;
        
        paymentToken.safeTransferFrom(msg.sender, address(this), contestantDepositAmount);
        
        emit ContestantDeposited(msg.sender);
    }
    
    /**
     * @notice Contestant leaves contest and withdraws deposit
     * @dev Works in OPEN state (before contest starts) or CANCELLED state (full refund)
     */
    function leaveContest() external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.CANCELLED,
            "Cannot withdraw - contest in progress or settled"
        );
        require(isContestant[msg.sender], "Not a contestant");
        
        isContestant[msg.sender] = false;
        totalContestantDeposits -= contestantDepositAmount;
        
        // Only remove from array in OPEN state (before betting starts)
        // In CANCELLED state, keep array intact so spectator outcomeIds remain valid
        if (state == ContestState.OPEN) {
            // Remove from contestants array (swap with last and pop)
            for (uint256 i = 0; i < contestants.length; i++) {
                if (contestants[i] == msg.sender) {
                    contestants[i] = contestants[contestants.length - 1];
                    contestants.pop();
                    break;
                }
            }
        }
        
        paymentToken.safeTransfer(msg.sender, contestantDepositAmount);
    }
    
    /**
     * @notice Oracle starts the contest (closes contestant registration, opens betting)
     */
    function startContest() external onlyOracle {
        require(state == ContestState.OPEN, "Contest already started");
        require(contestants.length > 0, "No contestants");
        
        state = ContestState.IN_PROGRESS;
        bettingOpen = true; // Enable betting
        
        emit ContestStarted();
    }
    
    /**
     * @notice Oracle closes betting before contest ends
     * @dev Prevents last-second bets when outcome is nearly certain
     * 
     * Use case: Close betting when final round starts, before results are known
     * This prevents unfair late bets and potential race conditions
     */
    function closeBetting() external onlyOracle {
        require(state == ContestState.IN_PROGRESS, "Contest not in progress");
        require(bettingOpen, "Betting already closed");
        
        bettingOpen = false;
        
        emit BettingClosed();
    }
    
    // ============ Layer 2: Spectator Functions ============
    
    /**
     * @notice Calculate current LMSR price for an outcome
     * @param outcomeId The contestant to get price for
     * @return Current price per token
     */
    function calculateOutcomePrice(uint256 outcomeId) public view returns (uint256) {
        require(outcomeId < contestants.length, "Invalid outcome");
        
        int256 demand = netPosition[outcomeId];
        uint256 absDemand = demand >= 0 ? uint256(demand) : uint256(-demand);
        
        uint256 basePrice = PRICE_PRECISION;
        uint256 demandPremium = (absDemand * demandSensitivityBps) / liquidityParameter;
        
        if (demand < 0 && demandPremium < basePrice) {
            return basePrice - demandPremium;
        }
        
        return basePrice + demandPremium;
    }
    
    /**
     * @notice Spectator adds a prediction by betting on a specific contestant
     * @param outcomeId Index of contestant to bet on
     * @param amount Amount of payment token to deposit
     * @dev Uses LMSR pricing - popular contestants cost more
     */
    function addPrediction(uint256 outcomeId, uint256 amount) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.IN_PROGRESS, 
            "Betting not available"
        );
        require(
            state == ContestState.OPEN || bettingOpen, 
            "Betting closed"
        );
        require(outcomeId < contestants.length, "Invalid outcome");
        require(amount > 0, "Amount must be > 0");
        
        // Calculate entry fee (held until settlement)
        uint256 entryFee = (amount * SPECTATOR_ENTRY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 collateral = amount - entryFee;
        
        // Get current LMSR price
        uint256 price = calculateOutcomePrice(outcomeId);
        
        // Calculate tokens to mint
        uint256 tokensToMint = (collateral * PRICE_PRECISION) / price;
        
        // Accumulate fees (distributed on settlement)
        accumulatedPrizeBonus += entryFee / 2;
        contestantBonuses[contestants[outcomeId]] += entryFee / 2;
        
        // Transfer payment
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Track user's total deposits (for withdrawal refunds)
        spectatorTotalDeposited[msg.sender] += amount;
        
        // Mint ERC1155 tokens
        _mint(msg.sender, outcomeId, tokensToMint, "");
        
        // Update demand tracking
        netPosition[outcomeId] += int256(tokensToMint);
        totalVolumeOnContestant[contestants[outcomeId]] += tokensToMint;
        totalSpectatorCollateral += collateral;
        
        emit SpectatorDeposited(msg.sender, outcomeId, amount, tokensToMint);
    }
    
    // Complete sets removed - use depositOnOutcome() only
    
    /**
     * @notice Spectator withdraws their prediction (burns tokens, gets 100% refund)
     * @param outcomeId Which outcome to withdraw from
     * @param tokenAmount Amount of tokens to burn
     * 
     * @dev Works in:
     * - OPEN state (during registration)
     * - IN_PROGRESS with bettingOpen (before betting closes)
     * - CANCELLED state (full refund anytime)
     */
    function withdrawPrediction(uint256 outcomeId, uint256 tokenAmount) external nonReentrant {
        require(
            state == ContestState.OPEN || 
            state == ContestState.IN_PROGRESS || 
            state == ContestState.CANCELLED,
            "Cannot withdraw from settled contest"
        );
        
        // If IN_PROGRESS, betting must still be open (unless CANCELLED)
        if (state == ContestState.IN_PROGRESS) {
            require(bettingOpen, "Betting closed - cannot withdraw");
        }
        
        require(outcomeId < contestants.length, "Invalid outcome");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender, outcomeId) >= tokenAmount, "Insufficient balance");
        
        // Calculate what portion of user's total deposit this represents
        uint256 userTotalTokens = balanceOf(msg.sender, outcomeId);
        uint256 refundAmount = (spectatorTotalDeposited[msg.sender] * tokenAmount) / userTotalTokens;
        
        // Calculate fee portion to reverse
        uint256 feeInRefund = (refundAmount * SPECTATOR_ENTRY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 collateralInRefund = refundAmount - feeInRefund;
        
        // Burn tokens
        _burn(msg.sender, outcomeId, tokenAmount);
        netPosition[outcomeId] -= int256(tokenAmount);
        
        // Reverse fee accounting
        accumulatedPrizeBonus -= feeInRefund / 2;
        contestantBonuses[contestants[outcomeId]] -= feeInRefund / 2;
        
        // Reverse collateral
        totalSpectatorCollateral -= collateralInRefund;
        spectatorTotalDeposited[msg.sender] -= refundAmount;
        
        // Refund 100% of what they deposited for these tokens
        paymentToken.safeTransfer(msg.sender, refundAmount);
        
        emit SpectatorWithdrew(msg.sender, refundAmount);
    }
    
    // ============ Combined Settlement ============
    
    /**
     * @notice Oracle settles contest - distributes Layer 1 prizes and resolves Layer 2 market
     * @dev ONE call does everything!
     * @param winners Array of winner addresses in order
     * @param payoutBps Array of payout basis points (must sum to 10000)
     */
    function distribute(
        address[] calldata winners,
        uint256[] calldata payoutBps
    ) external onlyOracle nonReentrant {
        require(state == ContestState.IN_PROGRESS, "Contest not in progress");
        require(winners.length == contestants.length, "Winners length mismatch");
        require(payoutBps.length == contestants.length, "Payouts length mismatch");
        
        // Validate payouts sum to 100%
        uint256 totalBps = 0;
        for (uint256 i = 0; i < payoutBps.length; i++) {
            totalBps += payoutBps[i];
        }
        require(totalBps == BPS_DENOMINATOR, "Payouts must sum to 100%");
        
        state = ContestState.SETTLED;
        
        // Step 1: Calculate total pool (all money going to contestants)
        uint256 totalPool = totalContestantDeposits + accumulatedPrizeBonus;
        
        // Calculate total contestant bonuses
        uint256 totalBonuses = 0;
        for (uint256 i = 0; i < contestants.length; i++) {
            totalBonuses += contestantBonuses[contestants[i]];
        }
        
        totalPool += totalBonuses;
        
        // Step 2: Apply oracle fee to ENTIRE pool
        uint256 oracleFee = (totalPool * oracleFeeBps) / BPS_DENOMINATOR;
        uint256 afterOracleFee = totalPool - oracleFee;
        
        // Step 3: Calculate Layer 1 prize pool (after oracle fee)
        uint256 layer1PoolAfterFee = ((totalContestantDeposits + accumulatedPrizeBonus) * (BPS_DENOMINATOR - oracleFeeBps)) / BPS_DENOMINATOR;
        
        // Step 4: Set Layer 1 payouts
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 payout = (layer1PoolAfterFee * payoutBps[i]) / BPS_DENOMINATOR;
            finalContestantPayouts[winners[i]] = payout;
        }
        
        // Step 5: Pay oracle fee
        if (oracleFee > 0) {
            paymentToken.safeTransfer(oracle, oracleFee);
        }
        
        // Step 6: Distribute Layer 2 contestant bonuses (after oracle fee)
        uint256 bonusPoolAfterFee = (totalBonuses * (BPS_DENOMINATOR - oracleFeeBps)) / BPS_DENOMINATOR;
        
        for (uint256 i = 0; i < contestants.length; i++) {
            address contestant = contestants[i];
            uint256 bonus = contestantBonuses[contestant];
            if (bonus > 0) {
                // Apply oracle fee proportionally
                uint256 bonusAfterFee = (bonus * (BPS_DENOMINATOR - oracleFeeBps)) / BPS_DENOMINATOR;
                contestantBonuses[contestant] = 0;
                paymentToken.safeTransfer(contestant, bonusAfterFee);
            }
        }
        
        // Step 5: Determine Layer 2 winner (winner-take-all)
        // The first entry in winners array is the contest winner (highest payout)
        address contestWinner = winners[0];
        
        // Find which index in contestants array this winner is at
        for (uint256 i = 0; i < contestants.length; i++) {
            if (contestants[i] == contestWinner) {
                spectatorWinningOutcome = i;
                break;
            }
        }
        
        spectatorMarketResolved = true;
        
        emit ContestSettled(winners, payoutBps);
    }
    
    // ============ Claiming Functions ============
    
    /**
     * @notice Contestant claims their contest payout after settlement
     */
    function claimContestPayout() external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        
        uint256 payout = finalContestantPayouts[msg.sender];
        require(payout > 0, "No payout");
        
        finalContestantPayouts[msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, payout);
        
        emit ContestantPayoutClaimed(msg.sender, payout);
    }
    
    /**
     * @notice Spectator claims their prediction payout (winner-take-all)
     * @param outcomeId The outcome to claim
     */
    function claimPredictionPayout(uint256 outcomeId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(spectatorMarketResolved, "Market not resolved");
        require(outcomeId < contestants.length, "Invalid outcome");
        
        uint256 balance = balanceOf(msg.sender, outcomeId);
        require(balance > 0, "No tokens");
        
        _burn(msg.sender, outcomeId, balance);
        
        uint256 payout = 0;
        
        // Winner-take-all: only winning outcome gets paid
        if (outcomeId == spectatorWinningOutcome) {
            uint256 totalSupply = uint256(netPosition[outcomeId]);
            require(totalSupply > 0, "No supply");
            
            // Winners split ALL spectator collateral
            payout = (balance * totalSpectatorCollateral) / totalSupply;
            
            // Safety check
            uint256 available = paymentToken.balanceOf(address(this));
            if (payout > available) {
                payout = available;
            }
            
            if (payout > 0) {
                paymentToken.safeTransfer(msg.sender, payout);
            }
        }
        
        emit SpectatorPayoutRedeemed(msg.sender, outcomeId, payout);
    }
    
    // ============ Cancellation & Refunds ============
    
    /**
     * @notice Oracle cancels contest, enables refunds
     */
    function cancel() external onlyOracle {
        require(state != ContestState.SETTLED, "Already settled");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }
    
    /**
     * @notice Anyone can cancel if expired and not settled
     */
    function cancelExpired() external {
        require(block.timestamp >= expiryTimestamp, "Not expired");
        require(state != ContestState.SETTLED, "Already settled");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }
    
    // ============ View Functions ============
    
    function getContestantsCount() external view returns (uint256) {
        return contestants.length;
    }
    
    function getContestantAtIndex(uint256 index) external view returns (address) {
        require(index < contestants.length, "Invalid index");
        return contestants[index];
    }
}

