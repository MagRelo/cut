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
 * - Spectators predict on contestants using LMSR pricing
 * - Configurable entry fee split between prize pool and contestant bonuses
 * - Winner-take-all redemption based on Layer 1 results
 * - Can withdraw during OPEN phase only (full refund with deferred fees)
 * 
 * Key Innovation: ONE oracle call (`settleContest()`) settles both layers!
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
    
    /// @notice Portion of spectator deposit that goes to prize pool in basis points (e.g., 750 = 7.5%)
    uint256 public immutable prizeShareBps;
    
    /// @notice Portion of spectator deposit that goes to contestant bonuses in basis points (e.g., 750 = 7.5%)
    uint256 public immutable userShareBps;
    
    /// @notice Denominator for basis point calculations
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Price precision for LMSR calculations
    uint256 public constant PRICE_PRECISION = 1e6;
    
    /// @notice Current state of the contest
    /// OPEN: Contestants join, spectators predict (early predictions), withdrawals allowed
    /// ACTIVE: Contestants locked in, spectators still predicting, NO withdrawals (predictions locked in)
    /// LOCKED: Predictions closed, contest finishing
    /// SETTLED: Results in, users claim
    /// CLOSED: Force distributed
    /// CANCELLED: Contest cancelled, refunds available
    enum ContestState { OPEN, ACTIVE, LOCKED, SETTLED, CANCELLED, CLOSED }
    ContestState public state;
    
    // ============ Layer 1: Entry Data ============
    
    /// @notice Array of entry IDs (for iteration only)
    uint256[] public entries;
    
    /// @notice Maps entry ID to owner address
    mapping(uint256 => address) public entryOwner;
    
    /// @notice Tracks if entry has been withdrawn
    mapping(uint256 => bool) public entryWithdrawn;
    
    /// @notice Contest prize pool - sum of all contestant entry deposits
    uint256 public contestPrizePool;
    
    /// @notice Final payouts for each entry after settlement
    mapping(uint256 => uint256) public finalEntryPayouts;
    
    /// @notice Track all entry IDs owned by a user
    mapping(address => uint256[]) public userEntries;
    
    // ============ Layer 2: Spectator Data ============
    
    /// @notice Array of spectator addresses (for forceClose iteration)
    address[] public spectators;
    
    /// @notice Mapping to check if address is a spectator
    mapping(address => bool) public isSpectator;
    
    /// @notice Track net position for each entry ID (for LMSR pricing and total supply)
    mapping(uint256 => int256) public netPosition;
    
    /// @notice Prediction prize pool - collateral backing spectator prediction tokens (~85% of deposits)
    uint256 public predictionPrizePool;
    
    /// @notice Contest prize pool subsidy from spectators (7.5% of spectator deposits)
    uint256 public contestPrizePoolSubsidy;
    
    /// @notice Contestant subsidies per entry from prediction volume (7.5% of spectator deposits)
    mapping(uint256 => uint256) public contestantSubsidy;
    
    /// @notice Track deposits per spectator per entry (for withdrawal refunds)
    mapping(address => mapping(uint256 => uint256)) public spectatorDepositedPerEntry;
    
    /// @notice Winning entry ID after settlement (for winner-take-all)
    uint256 public spectatorWinningEntry;
    
    /// @notice Flag indicating if spectator market has been resolved
    bool public spectatorMarketResolved;
    
    /// @notice Accumulated oracle fee from settlement (claimable by oracle)
    uint256 public accumulatedOracleFee;
    
    // ============ Events ============
    
    event EntryDeposited(address indexed owner, uint256 indexed entryId);
    event EntryWithdrawn(uint256 indexed entryId, address indexed owner, uint256 spectatorsRefunded);
    event ContestActivated();
    event PredictionsClosed();
    event PredictionAdded(address indexed spectator, uint256 indexed entryId, uint256 amount, uint256 tokensReceived);
    event PredictionWithdrawn(address indexed spectator, uint256 amount);
    event ContestSettled(uint256[] winningEntries, uint256[] payouts);
    event EntryPayoutClaimed(address indexed owner, uint256 indexed entryId, uint256 amount);
    event SpectatorPayoutRedeemed(address indexed spectator, uint256 indexed entryId, uint256 payout);
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
     * @param _prizeShareBps Portion of spectator deposit going to prize pool (e.g., 750 = 7.5%)
     * @param _userShareBps Portion of spectator deposit going to contestant bonuses (e.g., 750 = 7.5%)
     */
    constructor(
        address _paymentToken,
        address _oracle,
        uint256 _contestantDepositAmount,
        uint256 _oracleFeeBps,
        uint256 _expiryTimestamp,
        uint256 _liquidityParameter,
        uint256 _demandSensitivityBps,
        uint256 _prizeShareBps,
        uint256 _userShareBps
    ) ERC1155("") {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_oracle != address(0), "Invalid oracle");
        require(_contestantDepositAmount > 0, "Invalid deposit amount");
        require(_oracleFeeBps <= 1000, "Oracle fee too high"); // Max 10%
        require(_expiryTimestamp > block.timestamp, "Expiry in past");
        require(_liquidityParameter > 0, "Invalid liquidity parameter");
        require(_demandSensitivityBps <= BPS_DENOMINATOR, "Invalid demand sensitivity");
        require(_prizeShareBps + _userShareBps <= BPS_DENOMINATOR, "Total fees exceed 100%");
        
        paymentToken = IERC20(_paymentToken);
        oracle = _oracle;
        contestantDepositAmount = _contestantDepositAmount;
        oracleFeeBps = _oracleFeeBps;
        expiryTimestamp = _expiryTimestamp;
        liquidityParameter = _liquidityParameter;
        demandSensitivityBps = _demandSensitivityBps;
        prizeShareBps = _prizeShareBps;
        userShareBps = _userShareBps;
        
        state = ContestState.OPEN;
    }
    
    // ============ Layer 1: Entry Functions ============
    
    /**
     * @notice User joins the contest with a specific entry ID
     * @param entryId Unique entry ID (from database/external system)
     * @dev Must deposit exact contestantDepositAmount per entry
     */
    function joinContest(uint256 entryId) external nonReentrant {
        require(state == ContestState.OPEN, "Contest not open");
        require(entryOwner[entryId] == address(0), "Entry already exists");
        require(block.timestamp < expiryTimestamp, "Contest expired");
        
        entries.push(entryId);
        entryOwner[entryId] = msg.sender;
        userEntries[msg.sender].push(entryId);
        
        // Deduct oracle fee
        uint256 oracleFee = _calculateOracleFee(contestantDepositAmount);
        accumulatedOracleFee += oracleFee;
        contestPrizePool += contestantDepositAmount - oracleFee;
        
        paymentToken.safeTransferFrom(msg.sender, address(this), contestantDepositAmount);
        
        emit EntryDeposited(msg.sender, entryId);
    }
    
    /**
     * @notice User withdraws an entry and gets deposit back
     * @param entryId Entry to withdraw
     * @dev Works in OPEN state (before contest starts) or CANCELLED state (full refund)
     * @dev Spectator funds on this entry remain in prize pool (no refunds)
     */
    function leaveContest(uint256 entryId) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.CANCELLED,
            "Cannot withdraw - contest in progress or settled"
        );
        require(entryOwner[entryId] == msg.sender, "Not entry owner");
        require(!entryWithdrawn[entryId], "Entry already withdrawn");
        
        // Mark entry as withdrawn
        entryWithdrawn[entryId] = true;
        
        // Reverse oracle fee deduction from contestant deposit
        uint256 oracleFee = _calculateOracleFee(contestantDepositAmount);
        accumulatedOracleFee -= oracleFee;
        contestPrizePool -= (contestantDepositAmount - oracleFee);
        
        // Spectator funds on this entry are redistributed to winners:
        // - contestPrizePoolSubsidy: already in pool → goes to all winners
        // - contestantSubsidy[entryId]: move to prize pool since entry owner left
        // - predictionPrizePool: already in pool → goes to winning spectators
        uint256 orphanedBonus = contestantSubsidy[entryId];
        if (orphanedBonus > 0) {
            contestantSubsidy[entryId] = 0;
            contestPrizePoolSubsidy += orphanedBonus;
        }
        
        // Refund entry owner (full amount)
        paymentToken.safeTransfer(msg.sender, contestantDepositAmount);
        
        emit EntryWithdrawn(entryId, msg.sender, 0);
    }
    
    /**
     * @notice Oracle activates the contest (closes entry registration, predictions continue)
     */
    function activateContest() external onlyOracle {
        require(state == ContestState.OPEN, "Contest already started");
        require(entries.length > 0, "No entries");
        
        state = ContestState.ACTIVE;
        
        emit ContestActivated();
    }
    
    /**
     * @notice Oracle closes predictions before contest ends
     * @dev Prevents last-second predictions when outcome is nearly certain
     * 
     * Use case: Close predictions when final round starts, before results are known
     * This prevents unfair late predictions and potential race conditions
     */
    function closePredictions() external onlyOracle {
        require(state == ContestState.ACTIVE, "Contest not active");
        
        state = ContestState.LOCKED;
        
        emit PredictionsClosed();
    }
    
    // ============ Fee Calculation Helpers ============
    
    /**
     * @notice Calculate spectator deposit split into prize share, user share, and collateral
     * @param amount Total deposit amount
     * @return prizeShare Amount going to prize pool subsidy
     * @return userShare Amount going to contestant bonus
     * @return collateral Amount backing prediction tokens
     */
    function _calculateSpectatorSplit(uint256 amount) internal view returns (
        uint256 prizeShare,
        uint256 userShare,
        uint256 collateral
    ) {
        prizeShare = (amount * prizeShareBps) / BPS_DENOMINATOR;
        userShare = (amount * userShareBps) / BPS_DENOMINATOR;
        collateral = amount - prizeShare - userShare;
    }
    
    /**
     * @notice Calculate oracle fee from an amount
     * @param amount Amount to calculate fee on
     * @return fee Oracle fee amount
     */
    function _calculateOracleFee(uint256 amount) internal view returns (uint256 fee) {
        fee = (amount * oracleFeeBps) / BPS_DENOMINATOR;
    }
    
    // ============ Layer 2: Spectator Functions ============
    
    /**
     * @notice Calculate current LMSR price for an entry
     * @param entryId The entry to get price for
     * @return Current price per token
     */
    function calculateEntryPrice(uint256 entryId) public view returns (uint256) {
        require(entryOwner[entryId] != address(0), "Entry does not exist");
        require(!entryWithdrawn[entryId], "Entry withdrawn");
        
        int256 demand = netPosition[entryId];
        uint256 absDemand = demand >= 0 ? uint256(demand) : uint256(-demand);
        
        uint256 basePrice = PRICE_PRECISION;
        uint256 demandPremium = (absDemand * demandSensitivityBps) / liquidityParameter;
        
        if (demand < 0 && demandPremium < basePrice) {
            return basePrice - demandPremium;
        }
        
        return basePrice + demandPremium;
    }
    
    /**
     * @notice Spectator adds a prediction by predicting on a specific entry
     * @param entryId Entry ID to predict on
     * @param amount Amount of payment token to deposit
     * @dev Uses LMSR pricing - popular entries cost more
     */
    function addPrediction(uint256 entryId, uint256 amount) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.ACTIVE, 
            "Predictions not available"
        );
        require(entryOwner[entryId] != address(0), "Entry does not exist");
        require(!entryWithdrawn[entryId], "Entry withdrawn");
        require(amount > 0, "Amount must be > 0");
        
        // Track new spectators (for forceClose iteration)
        if (!isSpectator[msg.sender]) {
            spectators.push(msg.sender);
            isSpectator[msg.sender] = true;
        }
        
        // Deduct oracle fee first
        uint256 oracleFee = _calculateOracleFee(amount);
        accumulatedOracleFee += oracleFee;
        uint256 amountAfterFee = amount - oracleFee;
        
        // Calculate fee split on amount after oracle fee
        (uint256 prizeShare, uint256 userShare, uint256 collateral) = _calculateSpectatorSplit(amountAfterFee);

        // Accumulate subsidies (distributed on settlement)
        contestPrizePoolSubsidy += prizeShare;
        contestantSubsidy[entryId] += userShare;

        // Track deposits per entry (for withdrawal refunds)
        spectatorDepositedPerEntry[msg.sender][entryId] += amount;
        
        // Get current LMSR price
        uint256 price = calculateEntryPrice(entryId);
        
        // Calculate tokens to mint
        uint256 tokensToMint = (collateral * PRICE_PRECISION) / price;
        
        // Mint ERC1155 tokens (token ID = entry ID)
        _mint(msg.sender, entryId, tokensToMint, "");
        
        // Update demand tracking
        netPosition[entryId] += int256(tokensToMint);
        predictionPrizePool += collateral;
        
        // Pull payment from spectator
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit PredictionAdded(msg.sender, entryId, amount, tokensToMint);
    }
    
    /**
     * @notice Spectator withdraws their prediction (burns tokens, gets 100% refund)
     * @param entryId Which entry to withdraw from
     * @param tokenAmount Amount of tokens to burn
     * 
     * @dev Works in:
     * - OPEN state (during registration, before competition starts)
     * - CANCELLED state (full refund anytime)
     * 
     * @dev NOT allowed in ACTIVE state - once competition starts, predictions are locked
     */
    function withdrawPrediction(uint256 entryId, uint256 tokenAmount) external nonReentrant {
        require(
            state == ContestState.OPEN || 
            state == ContestState.CANCELLED,
            "Cannot withdraw - competition started or settled"
        );
        
        require(entryOwner[entryId] != address(0), "Entry does not exist");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender, entryId) >= tokenAmount, "Insufficient balance");
        
        // Calculate what portion of user's deposit this represents
        uint256 userTotalTokens = balanceOf(msg.sender, entryId);
        uint256 depositedOnEntry = spectatorDepositedPerEntry[msg.sender][entryId];
        uint256 refundAmount = (depositedOnEntry * tokenAmount) / userTotalTokens;
        
        // Reverse oracle fee
        uint256 oracleFee = _calculateOracleFee(refundAmount);
        accumulatedOracleFee -= oracleFee;
        uint256 amountAfterFee = refundAmount - oracleFee;
        
        // Calculate fee split reversal using helper (on amount after oracle fee)
        (uint256 prizeShare, uint256 userShare, uint256 collateral) = _calculateSpectatorSplit(amountAfterFee);
        
        // Burn tokens
        _burn(msg.sender, entryId, tokenAmount);
        netPosition[entryId] -= int256(tokenAmount);
        
        // Reverse fee accounting
        contestPrizePoolSubsidy -= prizeShare;
        contestantSubsidy[entryId] -= userShare;
        
        // Reverse collateral
        predictionPrizePool -= collateral;
        spectatorDepositedPerEntry[msg.sender][entryId] -= refundAmount;
        
        // Refund 100% of what they deposited for these tokens
        paymentToken.safeTransfer(msg.sender, refundAmount);
        
        emit PredictionWithdrawn(msg.sender, refundAmount);
    }
    
    // ============ Combined Settlement ============
    
    /**
     * @notice Oracle settles contest - pure accounting (no transfers)
     * @param winningEntries Array of winning entry IDs (only entries with payouts > 0)
     * @param payoutBps Array of payout basis points (must sum to 10000)
     * @dev First entry in winningEntries is the overall winner (for spectator market)
     * @dev Entries not included are assumed to have 0% payout
     * @dev All payouts stored for later claims - NO transfers in this function
     */
    function settleContest(
        uint256[] calldata winningEntries,
        uint256[] calldata payoutBps
    ) external onlyOracle nonReentrant {
        require(
            state == ContestState.ACTIVE || state == ContestState.LOCKED, 
            "Contest not active or locked"
        );
        require(winningEntries.length > 0, "Must have at least one winner");
        require(winningEntries.length == payoutBps.length, "Array length mismatch");
        require(winningEntries.length <= entries.length, "Too many winners");
        
        // Validate payouts sum to 100%
        uint256 totalBps = 0;
        for (uint256 i = 0; i < payoutBps.length; i++) {
            require(payoutBps[i] > 0, "Use non-zero payouts only");
            totalBps += payoutBps[i];
        }
        require(totalBps == BPS_DENOMINATOR, "Payouts must sum to 100%");
        
        state = ContestState.SETTLED;
        
        // Oracle fees already deducted at deposit time - accumulatedOracleFee is ready to claim
        // All pools (contestPrizePool, contestPrizePoolSubsidy, contestantSubsidy, predictionPrizePool)
        // are already net of oracle fees
        
        // Step 1: Calculate Layer 1 prize pool (already after oracle fee)
        uint256 layer1Pool = contestPrizePool + contestPrizePoolSubsidy;
        
        // Step 2: Store contestant prize payouts (NO TRANSFERS)
        for (uint256 i = 0; i < winningEntries.length; i++) {
            uint256 entryId = winningEntries[i];
            uint256 payout = (layer1Pool * payoutBps[i]) / BPS_DENOMINATOR;
            finalEntryPayouts[entryId] = payout;
        }
        
        // Step 3: Contestant bonuses already net of oracle fee - no adjustment needed
        // contestantSubsidy[entryId] values are ready to be claimed as-is
        
        // Step 4: Set Layer 2 winner (winner-take-all)
        spectatorWinningEntry = winningEntries[0];
        spectatorMarketResolved = true;

        // Step 5: Handle edge case - no ERC1155 supply on winning entry
        // Add spectator pool to winning contestants' payouts
        uint256 winnerSupply = uint256(netPosition[spectatorWinningEntry]);
        if (predictionPrizePool > 0 && winnerSupply == 0) {
            uint256 poolToDistribute = predictionPrizePool;
            predictionPrizePool = 0;
            uint256 distributed = 0;
            for (uint256 i = 0; i < winningEntries.length; i++) {
                uint256 entryId = winningEntries[i];
                uint256 extra = (poolToDistribute * payoutBps[i]) / BPS_DENOMINATOR;
                if (extra > 0) {
                    distributed += extra;
                    finalEntryPayouts[entryId] += extra;
                }
            }
            // Send any rounding remainder to the top winner
            if (distributed < poolToDistribute) {
                uint256 remainder = poolToDistribute - distributed;
                finalEntryPayouts[winningEntries[0]] += remainder;
            }
        }

        emit ContestSettled(winningEntries, payoutBps);
    }
    
    // ============ Claiming Functions ============
    
    /**
     * @notice User claims payout for a specific entry after settlement
     * @param entryId The entry to claim payout for
     * @dev Pays both prize payout AND contestant bonus in one transaction
     */
    function claimEntryPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(entryOwner[entryId] == msg.sender, "Not entry owner");
        
        uint256 payout = finalEntryPayouts[entryId];
        uint256 bonus = contestantSubsidy[entryId];
        uint256 totalClaim = payout + bonus;
        
        require(totalClaim > 0, "No payout");
        
        // Clear both payouts
        finalEntryPayouts[entryId] = 0;
        contestantSubsidy[entryId] = 0;
        
        // Single transfer for both prize + bonus
        paymentToken.safeTransfer(msg.sender, totalClaim);
        
        emit EntryPayoutClaimed(msg.sender, entryId, totalClaim);
    }
    
    /**
     * @notice Oracle claims accumulated fee from settlement
     */
    function claimOracleFee() external nonReentrant {
        require(msg.sender == oracle, "Not oracle");
        require(accumulatedOracleFee > 0, "No fee to claim");
        
        uint256 fee = accumulatedOracleFee;
        accumulatedOracleFee = 0;
        
        paymentToken.safeTransfer(oracle, fee);
    }
    
    /**
     * @notice Spectator claims their prediction payout (winner-take-all)
     * @param entryId The entry to claim
     */
    function claimPredictionPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(spectatorMarketResolved, "Market not resolved");
        require(entryOwner[entryId] != address(0), "Entry does not exist");
        require(!entryWithdrawn[entryId], "Entry was withdrawn");
        
        uint256 balance = balanceOf(msg.sender, entryId);
        require(balance > 0, "No tokens");
        
        // Burn user tokens first
        _burn(msg.sender, entryId, balance);
        
        uint256 payout = 0;
        
        // Winner-take-all: only winning entry gets paid
        if (entryId == spectatorWinningEntry) {
            // Capture supply BEFORE decrement for proportional payout
            uint256 totalSupplyBefore = uint256(netPosition[entryId]);
            require(totalSupplyBefore > 0, "No supply");
            
            // Winners split ALL spectator collateral
            payout = (balance * predictionPrizePool) / totalSupplyBefore;
            
            // Decrement supply by burned balance
            if (balance > 0) {
                netPosition[entryId] -= int256(balance);
            }
            
            // Safety check
            uint256 available = paymentToken.balanceOf(address(this));
            if (payout > available) {
                payout = available;
            }
            
            if (payout > 0) {
                // Decrement prediction pool by paid amount (cap to avoid underflow)
                if (payout <= predictionPrizePool) {
                    predictionPrizePool -= payout;
                } else {
                    predictionPrizePool = 0;
                }
                paymentToken.safeTransfer(msg.sender, payout);
            }
            
            // If this was the last claim (no supply remains), sweep any dust to the last claimant
            uint256 remainingSupply = uint256(netPosition[entryId]);
            if (remainingSupply == 0) {
                uint256 remaining = paymentToken.balanceOf(address(this));
                if (remaining > 0) {
                    predictionPrizePool = 0;
                    paymentToken.safeTransfer(msg.sender, remaining);
                }
            }
        }
        
        emit SpectatorPayoutRedeemed(msg.sender, entryId, payout);
    }
    
    // ============ Cancellation & Refunds ============
    
    /**
     * @notice Oracle cancels contest, enables refunds
     * @dev Cannot cancel after settlement - settlement is final
     */
    function cancelContest() external onlyOracle {
        require(state != ContestState.SETTLED && state != ContestState.CLOSED, "Contest settled - cannot cancel");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }
    
    /**
     * @notice Anyone can cancel if expired and not settled
     */
    function cancelExpired() external {
        require(block.timestamp >= expiryTimestamp, "Not expired");
        require(state != ContestState.SETTLED && state != ContestState.CLOSED, "Already settled");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }
    
    // ============ Optional Push Functions (Convenience) ============
    
    /**
     * @notice Push contestant payouts (prize + bonus) to specific entries
     * @param entryIds Array of entry IDs to push payouts for
     * @dev Oracle can use this to help users who forgot to claim
     * @dev Gas-efficient: oracle controls which entries to push
     */
    function pushContestantPayouts(uint256[] calldata entryIds) external onlyOracle nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        
        for (uint256 i = 0; i < entryIds.length; i++) {
            uint256 entryId = entryIds[i];
            uint256 payout = finalEntryPayouts[entryId];
            uint256 bonus = contestantSubsidy[entryId];
            uint256 totalClaim = payout + bonus;
            
            if (totalClaim > 0) {
                finalEntryPayouts[entryId] = 0;
                contestantSubsidy[entryId] = 0;
                address owner = entryOwner[entryId];
                paymentToken.safeTransfer(owner, totalClaim);
                emit EntryPayoutClaimed(owner, entryId, totalClaim);
            }
        }
    }
    
    /**
     * @notice Push spectator payouts to specific addresses
     * @param spectatorAddresses Array of spectator addresses to push payouts for
     * @param entryId The winning entry ID (should be spectatorWinningEntry)
     * @dev Oracle can use this to help spectators who forgot to claim
     * @dev Gas-efficient: oracle controls which spectators to push
     */
    function pushSpectatorPayouts(address[] calldata spectatorAddresses, uint256 entryId) external onlyOracle nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(spectatorMarketResolved, "Market not resolved");
        require(entryId == spectatorWinningEntry, "Not winning entry");
        
        uint256 totalSupplyBefore = uint256(netPosition[entryId]);
        require(totalSupplyBefore > 0, "No supply");
        
        for (uint256 i = 0; i < spectatorAddresses.length; i++) {
            address spectator = spectatorAddresses[i];
            uint256 balance = balanceOf(spectator, entryId);
            
            if (balance > 0) {
                _burn(spectator, entryId, balance);
                netPosition[entryId] -= int256(balance);
                
                uint256 payout = (balance * predictionPrizePool) / totalSupplyBefore;
                
                if (payout > 0) {
                    if (payout <= predictionPrizePool) {
                        predictionPrizePool -= payout;
                    } else {
                        predictionPrizePool = 0;
                    }
                    paymentToken.safeTransfer(spectator, payout);
                    emit SpectatorPayoutRedeemed(spectator, entryId, payout);
                }
            }
        }
    }
    
    /**
     * @notice Sweep remaining unclaimed funds to treasury after expiry
     * @dev Can only be called after expiryTimestamp
     * @dev Sweeps any remaining balance to oracle address
     */
    function sweepToTreasury() external onlyOracle nonReentrant {
        require(block.timestamp >= expiryTimestamp, "Expiry not reached");
        
        uint256 remaining = paymentToken.balanceOf(address(this));
        if (remaining > 0) {
            paymentToken.safeTransfer(oracle, remaining);
            
            // Zero out any remaining accounting
            predictionPrizePool = 0;
            accumulatedOracleFee = 0;
            
            state = ContestState.CLOSED;
        }
    }
    
    // ============ View Functions ============
    
    function getEntriesCount() external view returns (uint256) {
        return entries.length;
    }
    
    function getEntryAtIndex(uint256 index) external view returns (uint256) {
        require(index < entries.length, "Invalid index");
        return entries[index];
    }
    
    function getUserEntriesCount(address user) external view returns (uint256) {
        return userEntries[user].length;
    }
    
    function getUserEntryAtIndex(address user, uint256 index) external view returns (uint256) {
        require(index < userEntries[user].length, "Invalid index");
        return userEntries[user][index];
    }
    
    function getSpectatorsCount() external view returns (uint256) {
        return spectators.length;
    }
    
    function getSpectatorAtIndex(uint256 index) external view returns (address) {
        require(index < spectators.length, "Invalid index");
        return spectators[index];
    }
}


