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
    
    /// @notice Total contestant deposits collected
    uint256 public totalContestantDeposits;
    
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
    
    /// @notice Total collateral from spectators (85% of deposits)
    uint256 public totalSpectatorCollateral;
    
    /// @notice Accumulated prize bonus to augment Layer 1 pool
    uint256 public accumulatedPrizeBonus;
    
    /// @notice Bonuses earned by each entry from prediction volume
    mapping(uint256 => uint256) public entryBonuses;
    
    /// @notice Total prediction volume on each entry (for transparency)
    mapping(uint256 => uint256) public totalVolumeOnEntry;
    
    /// @notice Track total payment tokens deposited by each spectator (for withdrawals)
    mapping(address => uint256) public spectatorTotalDeposited;
    
    /// @notice Track deposits per spectator per entry (for auto-refunds on withdrawal)
    mapping(address => mapping(uint256 => uint256)) public spectatorDepositedPerEntry;
    
    /// @notice Winning entry ID after settlement (for winner-take-all)
    uint256 public spectatorWinningEntry;
    
    /// @notice Flag indicating if spectator market has been resolved
    bool public spectatorMarketResolved;
    
    // ============ Events ============
    
    event EntryDeposited(address indexed owner, uint256 indexed entryId);
    event EntryWithdrawn(uint256 indexed entryId, address indexed owner, uint256 spectatorsRefunded);
    event ContestActivated();
    event PredictionsClosed();
    event SpectatorDeposited(address indexed spectator, uint256 indexed entryId, uint256 amount, uint256 tokensReceived);
    event SpectatorWithdrew(address indexed spectator, uint256 amount);
    event SpectatorAutoRefunded(address indexed spectator, uint256 indexed entryId, uint256 amount);
    event ContestSettled(uint256[] winningEntries, uint256[] payouts);
    event EntryPayoutClaimed(address indexed owner, uint256 indexed entryId, uint256 amount);
    event SpectatorPayoutRedeemed(address indexed spectator, uint256 indexed entryId, uint256 payout);
    event ContestCancelled();
    event ContestForceDistributed(uint256 entriesPaid, uint256 spectatorsPaid, uint256 timestamp);
    
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
        totalContestantDeposits += contestantDepositAmount;
        
        paymentToken.safeTransferFrom(msg.sender, address(this), contestantDepositAmount);
        
        emit EntryDeposited(msg.sender, entryId);
    }
    
    /**
     * @notice User withdraws an entry and gets deposit back
     * @param entryId Entry to withdraw
     * @dev Works in OPEN state (before contest starts) or CANCELLED state (full refund)
     * @dev Automatically refunds all spectators who predicted on this entry
     */
    function leaveContest(uint256 entryId) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.CANCELLED,
            "Cannot withdraw - contest in progress or settled"
        );
        require(entryOwner[entryId] == msg.sender, "Not entry owner");
        require(!entryWithdrawn[entryId], "Entry already withdrawn");
        
        // Mark entry as withdrawn first
        entryWithdrawn[entryId] = true;
        totalContestantDeposits -= contestantDepositAmount;
        
        // Auto-refund all spectators who predicted on this entry
        uint256 refundCount = 0;
        for (uint256 i = 0; i < spectators.length; i++) {
            address spectator = spectators[i];
            uint256 tokenBalance = balanceOf(spectator, entryId);
            
            if (tokenBalance > 0) {
                uint256 depositedOnThisEntry = spectatorDepositedPerEntry[spectator][entryId];
                
                if (depositedOnThisEntry > 0) {
                    // Burn tokens
                    _burn(spectator, entryId, tokenBalance);
                    
                    // Calculate fee split reversal
                    uint256 prizeShare = (depositedOnThisEntry * prizeShareBps) / BPS_DENOMINATOR;
                    uint256 userShare = (depositedOnThisEntry * userShareBps) / BPS_DENOMINATOR;
                    uint256 totalFee = prizeShare + userShare;
                    uint256 collateralInDeposit = depositedOnThisEntry - totalFee;
                    
                    // Reverse accounting
                    netPosition[entryId] -= int256(tokenBalance);
                    accumulatedPrizeBonus -= prizeShare;
                    entryBonuses[entryId] -= userShare;
                    totalSpectatorCollateral -= collateralInDeposit;
                    spectatorTotalDeposited[spectator] -= depositedOnThisEntry;
                    spectatorDepositedPerEntry[spectator][entryId] = 0;
                    
                    // Refund 100% to spectator
                    paymentToken.safeTransfer(spectator, depositedOnThisEntry);
                    
                    emit SpectatorAutoRefunded(spectator, entryId, depositedOnThisEntry);
                    refundCount++;
                }
            }
        }
        
        // Refund entry owner
        paymentToken.safeTransfer(msg.sender, contestantDepositAmount);
        
        emit EntryWithdrawn(entryId, msg.sender, refundCount);
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
        
        // Split fees based on configured shares
        uint256 prizeShare = (amount * prizeShareBps) / BPS_DENOMINATOR;
        uint256 userShare = (amount * userShareBps) / BPS_DENOMINATOR;
        uint256 totalFee = prizeShare + userShare;
        uint256 collateral = amount - totalFee;
        
        // Get current LMSR price
        uint256 price = calculateEntryPrice(entryId);
        
        // Calculate tokens to mint
        uint256 tokensToMint = (collateral * PRICE_PRECISION) / price;
        
        // Accumulate fees (distributed on settlement)
        accumulatedPrizeBonus += prizeShare;
        entryBonuses[entryId] += userShare;
        
        // Transfer payment
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Track user's total deposits (for withdrawal refunds)
        spectatorTotalDeposited[msg.sender] += amount;
        spectatorDepositedPerEntry[msg.sender][entryId] += amount;
        
        // Mint ERC1155 tokens (token ID = entry ID)
        _mint(msg.sender, entryId, tokensToMint, "");
        
        // Update demand tracking
        netPosition[entryId] += int256(tokensToMint);
        totalVolumeOnEntry[entryId] += tokensToMint;
        totalSpectatorCollateral += collateral;
        
        emit SpectatorDeposited(msg.sender, entryId, amount, tokensToMint);
    }
    
    // Complete sets removed - use depositOnOutcome() only
    
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
        
        // Calculate what portion of user's total deposit this represents
        uint256 userTotalTokens = balanceOf(msg.sender, entryId);
        uint256 refundAmount = (spectatorTotalDeposited[msg.sender] * tokenAmount) / userTotalTokens;
        
        // Calculate fee split reversal
        uint256 prizeShare = (refundAmount * prizeShareBps) / BPS_DENOMINATOR;
        uint256 userShare = (refundAmount * userShareBps) / BPS_DENOMINATOR;
        uint256 totalFee = prizeShare + userShare;
        uint256 collateralInRefund = refundAmount - totalFee;
        
        // Burn tokens
        _burn(msg.sender, entryId, tokenAmount);
        netPosition[entryId] -= int256(tokenAmount);
        
        // Reverse fee accounting
        accumulatedPrizeBonus -= prizeShare;
        entryBonuses[entryId] -= userShare;
        
        // Reverse collateral
        totalSpectatorCollateral -= collateralInRefund;
        spectatorTotalDeposited[msg.sender] -= refundAmount;
        spectatorDepositedPerEntry[msg.sender][entryId] -= refundAmount;
        
        // Refund 100% of what they deposited for these tokens
        paymentToken.safeTransfer(msg.sender, refundAmount);
        
        emit SpectatorWithdrew(msg.sender, refundAmount);
    }
    
    // ============ Combined Settlement ============
    
    /**
     * @notice Oracle settles contest - distributes Layer 1 prizes and resolves Layer 2 market
     * @dev ONE call does everything!
     * @param winningEntries Array of winning entry IDs (only entries with payouts > 0)
     * @param payoutBps Array of payout basis points (must sum to 10000)
     * @dev First entry in winningEntries is the overall winner (for spectator market)
     * @dev Entries not included are assumed to have 0% payout
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
        
        // Step 1: Calculate total pool (all money going to entries)
        uint256 totalPool = totalContestantDeposits + accumulatedPrizeBonus;
        
        // Calculate total entry bonuses
        uint256 totalBonuses = 0;
        for (uint256 i = 0; i < entries.length; i++) {
            totalBonuses += entryBonuses[entries[i]];
        }
        
        totalPool += totalBonuses;
        
        // Step 2: Apply oracle fee to ENTIRE pool
        uint256 oracleFee = (totalPool * oracleFeeBps) / BPS_DENOMINATOR;
        
        // Step 3: Calculate Layer 1 prize pool (after oracle fee)
        uint256 layer1PoolAfterFee = ((totalContestantDeposits + accumulatedPrizeBonus) * (BPS_DENOMINATOR - oracleFeeBps)) / BPS_DENOMINATOR;
        
        // Step 4: Set Layer 1 payouts (by entry ID - now safe for same owner multiple times!)
        for (uint256 i = 0; i < winningEntries.length; i++) {
            uint256 entryId = winningEntries[i];
            uint256 payout = (layer1PoolAfterFee * payoutBps[i]) / BPS_DENOMINATOR;
            finalEntryPayouts[entryId] = payout;
        }
        
        // Step 5: Pay oracle fee
        if (oracleFee > 0) {
            paymentToken.safeTransfer(oracle, oracleFee);
        }
        
        // Step 6: Distribute Layer 2 entry bonuses (after oracle fee)
        for (uint256 i = 0; i < entries.length; i++) {
            uint256 entryId = entries[i];
            uint256 bonus = entryBonuses[entryId];
            if (bonus > 0) {
                // Apply oracle fee proportionally
                uint256 bonusAfterFee = (bonus * (BPS_DENOMINATOR - oracleFeeBps)) / BPS_DENOMINATOR;
                entryBonuses[entryId] = 0;
                // Send bonus to entry owner
                paymentToken.safeTransfer(entryOwner[entryId], bonusAfterFee);
            }
        }
        
        // Step 7: Determine Layer 2 winner (winner-take-all)
        // The first entry in winningEntries array is the contest winner (highest payout)
        spectatorWinningEntry = winningEntries[0];
        spectatorMarketResolved = true;
        
        emit ContestSettled(winningEntries, payoutBps);
    }
    
    // ============ Claiming Functions ============
    
    /**
     * @notice User claims payout for a specific entry after settlement
     * @param entryId The entry to claim payout for
     */
    function claimEntryPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(entryOwner[entryId] == msg.sender, "Not entry owner");
        
        uint256 payout = finalEntryPayouts[entryId];
        require(payout > 0, "No payout");
        
        finalEntryPayouts[entryId] = 0;
        paymentToken.safeTransfer(msg.sender, payout);
        
        emit EntryPayoutClaimed(msg.sender, entryId, payout);
    }
    
    /**
     * @notice User claims payouts for all their entries at once
     */
    function claimAllEntryPayouts() external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        
        uint256 totalPayout = 0;
        uint256[] memory myEntries = userEntries[msg.sender];
        
        for (uint256 i = 0; i < myEntries.length; i++) {
            uint256 entryId = myEntries[i];
            uint256 payout = finalEntryPayouts[entryId];
            if (payout > 0) {
                finalEntryPayouts[entryId] = 0;
                totalPayout += payout;
                emit EntryPayoutClaimed(msg.sender, entryId, payout);
            }
        }
        
        require(totalPayout > 0, "No payouts");
        paymentToken.safeTransfer(msg.sender, totalPayout);
    }
    
    /**
     * @notice Spectator claims their prediction payout (winner-take-all)
     * @param entryId The entry to claim
     */
    function claimPredictionPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(spectatorMarketResolved, "Market not resolved");
        require(entryOwner[entryId] != address(0), "Entry does not exist");
        
        uint256 balance = balanceOf(msg.sender, entryId);
        require(balance > 0, "No tokens");
        
        _burn(msg.sender, entryId, balance);
        
        uint256 payout = 0;
        
        // Winner-take-all: only winning entry gets paid
        if (entryId == spectatorWinningEntry) {
            uint256 totalSupply = uint256(netPosition[entryId]);
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
    
    /**
     * @notice Distribute all unclaimed winnings after contest expires
     * @dev Can only be called after expiryTimestamp has passed
     * 
     * This function distributes all unclaimed winnings to their rightful owners:
     * - Pushes unclaimed entry payouts
     * - Pushes unclaimed spectator payouts (winners only)
     * 
     * Use case: Users forgot to claim or lost access to accounts.
     * After expiry, oracle can force distribution to prevent funds being locked forever.
     */
    function distributeExpiredContest() external onlyOracle nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(block.timestamp >= expiryTimestamp, "Expiry not reached");
        
        uint256 entriesPaid = 0;
        uint256 spectatorsPaid = 0;
        
        // Push unclaimed entry payouts
        for (uint256 i = 0; i < entries.length; i++) {
            uint256 entryId = entries[i];
            uint256 payout = finalEntryPayouts[entryId];
            if (payout > 0) {
                finalEntryPayouts[entryId] = 0;
                address owner = entryOwner[entryId];
                paymentToken.safeTransfer(owner, payout);
                entriesPaid++;
            }
        }
        
        // Push unclaimed spectator payouts (winners only)
        uint256 totalSupply = uint256(netPosition[spectatorWinningEntry]);
        
        if (totalSupply > 0) {
            for (uint256 i = 0; i < spectators.length; i++) {
                address spectator = spectators[i];
                uint256 balance = balanceOf(spectator, spectatorWinningEntry);
                if (balance > 0) {
                    _burn(spectator, spectatorWinningEntry, balance);
                    uint256 payout = (balance * totalSpectatorCollateral) / totalSupply;
                    if (payout > 0) {
                        paymentToken.safeTransfer(spectator, payout);
                        spectatorsPaid++;
                    }
                }
            }
        }
        
        state = ContestState.CLOSED;
        emit ContestForceDistributed(entriesPaid, spectatorsPaid, block.timestamp);
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

