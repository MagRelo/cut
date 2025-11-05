// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title Contest
 * @author MagRelo
 * @dev Combined contest and prediction market contract
 *
 * Three-layer architecture:
 * - Layer 0 (Oracle): Real-world event data provided by the oracle
 * - Layer 1 (Primary): Competition participants with fixed deposits
 * - Layer 2 (Secondary): Prediction market on primary outcomes using LMSR
 *
 * Layer 1 (Primary):
 * - Primary participants deposit fixed amount to enter
 * - Oracle distributes prizes based on results
 * - Winners claim their payouts
 *
 * Layer 2 (Secondary):
 * - Secondary participants predict on primary positions using LMSR pricing
 * - Configurable entry fee split between prize pool and primary position bonuses
 * - Winner-take-all redemption based on Layer 1 results
 * - Dynamic cross-subsidy keeps primary and secondary prize pools near a configurable ratio
 * - Can withdraw during OPEN phase only (full refund with deferred fees)
 *
 */
contract Contest is ERC1155, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The payment token used for deposits and payouts
    IERC20 public immutable paymentToken;

    /// @notice Address of the oracle that controls contest state
    address public immutable oracle;

    /// @notice Fixed deposit amount for primary participants
    uint256 public immutable primaryDepositAmount;

    /// @notice Oracle fee in basis points (e.g., 100 = 1%)
    uint256 public immutable oracleFeeBps;

    /// @notice Timestamp when contest expires (for refunds)
    uint256 public immutable expiryTimestamp;

    /// @notice LMSR liquidity parameter - controls price curve steepness
    uint256 public immutable liquidityParameter;

    /// @notice Demand sensitivity in basis points - controls LMSR price curve steepness
    uint256 public immutable demandSensitivityBps;

    /// @notice Portion of accumulated subsidy that goes to position bonuses in basis points (e.g., 5000 = 50%)
    /// @dev Remainder goes to prize pool. Applied at settlement, not per-deposit.
    uint256 public immutable positionBonusShareBps;

    /// @notice Target primary-side share (in basis points) used to balance cross-subsidies between pools
    uint256 public immutable targetPrimaryShareBps;

    /// @notice Maximum portion (in basis points) of any single deposit that can be reallocated to the opposite pool
    uint256 public immutable maxCrossSubsidyBps;

    /// @notice Denominator for basis point calculations
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Price precision for LMSR calculations
    uint256 public constant PRICE_PRECISION = 1e6;

    /// @notice Current state of the contest
    /// OPEN: Primary participants join, secondary participants add positions (early positions), withdrawals allowed
    /// ACTIVE: Primary positions locked in, secondary participants still adding positions, NO withdrawals (positions locked in)
    /// LOCKED: Secondary positions closed, contest finishing
    /// SETTLED: Results in, users claim
    /// CLOSED: Force distributed
    /// CANCELLED: Contest cancelled, refunds available
    enum ContestState {
        OPEN,
        ACTIVE,
        LOCKED,
        SETTLED,
        CANCELLED,
        CLOSED
    }

    ContestState public state;

    /// @notice Accumulated oracle fee from settlement (claimable by oracle)
    uint256 public accumulatedOracleFee;

    // ============ Layer 1: Primary Data ============

    /// @notice Array of entry IDs (for iteration only)
    uint256[] public entries;

    /// @notice Maps entry ID to owner address (address(0) = withdrawn)
    mapping(uint256 => address) public entryOwner;

    /// @notice Primary prize pool - sum of all primary participant entry deposits
    uint256 public primaryPrizePool;

    /// @notice Cross-subsidy from secondary to primary prize pool (allocated after position bonuses)
    uint256 public primaryPrizePoolSubsidy;

    /// @notice Track cross-subsidy amount from primary deposits that was redirected to the secondary pool per entry
    mapping(uint256 => uint256) public primaryToSecondarySubsidy;

    /// @notice Prize pool payouts for each entry after settlement
    mapping(uint256 => uint256) public primaryPrizePoolPayouts;

    /// @notice Merkle root for primary position whitelist (bytes32(0) = no gating)
    bytes32 public primaryMerkleRoot;

    // ============ Layer 2: Secondary Data ============

    /// @notice Track net position for each entry ID (for LMSR pricing and total supply)
    mapping(uint256 => int256) public netPosition;

    /// @notice Secondary prize pool - collateral backing secondary position tokens from secondary deposits
    uint256 public secondaryPrizePool;

    /// @notice Cross-subsidy from primary to secondary prize pool
    uint256 public secondaryPrizePoolSubsidy;

    /// @notice Accumulated bonus per entry from secondary deposits (allocated per-deposit based on positionBonusShareBps)
    mapping(uint256 => uint256) public primaryPositionSubsidy;

    /// @notice Aggregate of all outstanding primary position subsidies (sum of primaryPositionSubsidy values)
    uint256 public totalPrimaryPositionSubsidies;

    /// @notice Track deposits per secondary participant per entry (for withdrawal refunds)
    mapping(address => mapping(uint256 => uint256)) public secondaryDepositedPerEntry;

    /// @notice Track cross-subsidy amounts from secondary deposits that were redirected to the primary pool per participant/entry
    mapping(address => mapping(uint256 => uint256)) public secondaryToPrimarySubsidy;

    /// @notice Winning entry ID after settlement (for winner-take-all)
    uint256 public secondaryWinningEntry;

    /// @notice Flag indicating if secondary market has been resolved
    bool public secondaryMarketResolved;

    /// @notice Merkle root for secondary position whitelist (bytes32(0) = no gating)
    bytes32 public secondaryMerkleRoot;

    // ============ Events ============

    event PrimaryPositionAdded(address indexed owner, uint256 indexed entryId);
    event PrimaryPositionRemoved(uint256 indexed entryId, address indexed owner);
    event PrimaryPayoutClaimed(address indexed owner, uint256 indexed entryId, uint256 amount);
    event PrimaryMerkleRootUpdated(bytes32 newRoot);

    event SecondaryPositionAdded(
        address indexed participant, uint256 indexed entryId, uint256 amount, uint256 tokensReceived
    );
    event SecondaryPositionRemoved(address indexed participant, uint256 amount);
    event SecondaryPayoutClaimed(address indexed participant, uint256 indexed entryId, uint256 payout);
    event SecondaryMerkleRootUpdated(bytes32 newRoot);

    event ContestActivated();
    event ContestLocked();
    event ContestSettled(uint256[] winningEntries, uint256[] payouts);
    event ContestCancelled();
    event ContestClosed();

    /// @notice Modifier to restrict functions to only the oracle
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    /**
     * @notice Constructor initializes the contest
     * @param _paymentToken ERC20 token used for deposits and payouts
     * @param _oracle Address that controls contest lifecycle
     * @param _primaryDepositAmount Fixed amount each primary participant must deposit
     * @param _oracleFeeBps Oracle fee as basis points
     * @param _expiryTimestamp When contest expires (for refunds)
     * @param _liquidityParameter LMSR curve parameter - controls price curve steepness
     * @dev Recommended: Use ContestFactory which calculates this as primaryDepositAmount × 100
     * @dev Lower values = steeper curves (stronger early incentive), higher values = flatter curves
     * @param _demandSensitivityBps LMSR price sensitivity parameter
     * @param _positionBonusShareBps Portion of accumulated subsidy going to position bonuses (e.g., 5000 = 50%)
     * @param _targetPrimaryShareBps Target primary-side share for cross-subsidy balancing
     * @param _maxCrossSubsidyBps Maximum cross-subsidy per deposit
     */
    constructor(
        address _paymentToken,
        address _oracle,
        uint256 _primaryDepositAmount,
        uint256 _oracleFeeBps,
        uint256 _expiryTimestamp,
        uint256 _liquidityParameter,
        uint256 _demandSensitivityBps,
        uint256 _positionBonusShareBps,
        uint256 _targetPrimaryShareBps,
        uint256 _maxCrossSubsidyBps
    ) ERC1155("") {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_oracle != address(0), "Invalid oracle");
        require(_primaryDepositAmount > 0, "Invalid deposit amount");
        require(_oracleFeeBps <= 1000, "Oracle fee too high"); // Max 10%
        require(_expiryTimestamp > block.timestamp, "Expiry in past");
        require(_liquidityParameter > 0, "Invalid liquidity parameter");
        require(_demandSensitivityBps <= BPS_DENOMINATOR, "Invalid demand sensitivity");
        require(_positionBonusShareBps <= BPS_DENOMINATOR, "Invalid position bonus share");
        require(_targetPrimaryShareBps <= BPS_DENOMINATOR, "Invalid target ratio");
        require(_maxCrossSubsidyBps <= BPS_DENOMINATOR, "Invalid subsidy cap");

        paymentToken = IERC20(_paymentToken);
        oracle = _oracle;
        primaryDepositAmount = _primaryDepositAmount;
        oracleFeeBps = _oracleFeeBps;
        expiryTimestamp = _expiryTimestamp;
        liquidityParameter = _liquidityParameter;
        demandSensitivityBps = _demandSensitivityBps;
        positionBonusShareBps = _positionBonusShareBps;
        targetPrimaryShareBps = _targetPrimaryShareBps;
        maxCrossSubsidyBps = _maxCrossSubsidyBps;

        state = ContestState.OPEN;
    }

    // ============ Layer 1: Primary Functions ============

    /**
     * @notice User adds a primary position with a specific entry ID
     * @param entryId Unique entry ID (from database/external system)
     * @param merkleProof Merkle proof for whitelist verification (empty array if no gating)
     * @dev Must deposit exact primaryDepositAmount per entry
     */
    function addPrimaryPosition(uint256 entryId, bytes32[] calldata merkleProof) external nonReentrant {
        require(state == ContestState.OPEN, "Contest not open");
        require(entryOwner[entryId] == address(0), "Entry already exists");
        require(block.timestamp < expiryTimestamp, "Contest expired");

        // Verify merkle proof if root is set
        if (primaryMerkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            require(MerkleProof.verify(merkleProof, primaryMerkleRoot, leaf), "Invalid merkle proof");
        }

        entries.push(entryId);
        entryOwner[entryId] = msg.sender;

        // Deduct oracle fee
        uint256 oracleFee = _calculateOracleFee(primaryDepositAmount);
        accumulatedOracleFee += oracleFee;

        uint256 netAmount = primaryDepositAmount - oracleFee;
        uint256 crossSubsidy = _calculatePrimaryCrossSubsidy(netAmount);
        uint256 primaryContribution = netAmount - crossSubsidy;

        primaryPrizePool += primaryContribution;

        if (crossSubsidy > 0) {
            primaryToSecondarySubsidy[entryId] = crossSubsidy;
            secondaryPrizePoolSubsidy += crossSubsidy;
        }

        paymentToken.safeTransferFrom(msg.sender, address(this), primaryDepositAmount);

        emit PrimaryPositionAdded(msg.sender, entryId);
    }

    /**
     * @notice User removes a primary position and gets deposit back
     * @param entryId Entry to withdraw
     * @dev Works in OPEN state (before contest starts) or CANCELLED state (full refund)
     * @dev Secondary participant funds on this entry remain in prize pool (no refunds)
     */
    function removePrimaryPosition(uint256 entryId) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.CANCELLED,
            "Cannot withdraw - contest in progress or settled"
        );
        require(entryOwner[entryId] == msg.sender, "Not entry owner");

        // Mark entry as withdrawn by clearing owner
        entryOwner[entryId] = address(0);

        // Reverse oracle fee deduction from primary deposit
        uint256 oracleFee = _calculateOracleFee(primaryDepositAmount);
        accumulatedOracleFee -= oracleFee;
        uint256 netAmount = primaryDepositAmount - oracleFee;

        uint256 crossSubsidy = primaryToSecondarySubsidy[entryId];
        uint256 primaryContribution = netAmount - crossSubsidy;

        primaryPrizePool -= primaryContribution;

        if (crossSubsidy > 0) {
            primaryToSecondarySubsidy[entryId] = 0;
            secondaryPrizePoolSubsidy -= crossSubsidy;
        }

        // Forfeit position bonus - redistributed to remaining primary participants via prize pool
        uint256 bonus = primaryPositionSubsidy[entryId];
        if (bonus > 0) {
            primaryPositionSubsidy[entryId] = 0;
            totalPrimaryPositionSubsidies -= bonus;
            primaryPrizePool += bonus; // Bonus goes to remaining contestants
        }

        // Refund entry owner (full amount)
        paymentToken.safeTransfer(msg.sender, primaryDepositAmount);

        emit PrimaryPositionRemoved(entryId, msg.sender);
    }

    /**
     * @notice User claims payout for a specific entry after settlement
     * @param entryId The entry to claim payout for
     * @dev Pays both prize payout AND primary position bonus in one transaction
     */
    function claimPrimaryPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(entryOwner[entryId] == msg.sender, "Not entry owner");

        uint256 payout = primaryPrizePoolPayouts[entryId];
        uint256 bonus = primaryPositionSubsidy[entryId];
        uint256 totalClaim = payout + bonus;

        require(totalClaim > 0, "No payout");

        // Clear both payouts
        primaryPrizePoolPayouts[entryId] = 0;
        if (bonus > 0) {
            primaryPositionSubsidy[entryId] = 0;
            totalPrimaryPositionSubsidies -= bonus;
        }

        // Reduce pools by claimed amounts (forensic accounting integrity)
        // Payouts come from primaryPrizePool + primaryPrizePoolSubsidy
        uint256 totalPrimaryFunds = primaryPrizePool + primaryPrizePoolSubsidy;
        if (totalPrimaryFunds > 0) {
            uint256 fromBasePool = (payout * primaryPrizePool) / totalPrimaryFunds;
            uint256 fromSubsidyPool = payout - fromBasePool;

            if (fromBasePool <= primaryPrizePool) {
                primaryPrizePool -= fromBasePool;
            } else {
                primaryPrizePool = 0;
            }

            if (fromSubsidyPool <= primaryPrizePoolSubsidy) {
                primaryPrizePoolSubsidy -= fromSubsidyPool;
            } else {
                primaryPrizePoolSubsidy = 0;
            }
        }

        // Single transfer for both prize + bonus
        paymentToken.safeTransfer(msg.sender, totalClaim);

        emit PrimaryPayoutClaimed(msg.sender, entryId, totalClaim);
    }

    // ============ Layer 2: Secondary Functions ============

    /**
     * @notice Secondary participant adds a position on a specific entry
     * @param entryId Entry ID to add position on
     * @param amount Amount of payment token to deposit
     * @param merkleProof Merkle proof for whitelist verification (empty array if no gating)
     * @dev Deposit flow: oracle fee → position bonus (to entry owner) → cross-subsidy (dynamic) → collateral (backs ERC1155)
     * @dev Uses LMSR pricing - popular entries cost more
     */
    function addSecondaryPosition(uint256 entryId, uint256 amount, bytes32[] calldata merkleProof)
        external
        nonReentrant
    {
        require(state == ContestState.OPEN || state == ContestState.ACTIVE, "Secondary positions not available");
        require(entryOwner[entryId] != address(0), "Entry does not exist or withdrawn");
        require(amount > 0, "Amount must be > 0");

        // Verify merkle proof if root is set
        if (secondaryMerkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            require(MerkleProof.verify(merkleProof, secondaryMerkleRoot, leaf), "Invalid merkle proof");
        }

        // Deduct oracle fee first
        uint256 oracleFee = _calculateOracleFee(amount);
        accumulatedOracleFee += oracleFee;
        uint256 amountAfterFee = amount - oracleFee;

        // Step 1: Allocate position bonus to entry owner (direct reward for being popular)
        uint256 positionBonus = (amountAfterFee * positionBonusShareBps) / BPS_DENOMINATOR;
        uint256 remainingAmount = amountAfterFee - positionBonus;

        if (positionBonus > 0) {
            primaryPositionSubsidy[entryId] += positionBonus;
            totalPrimaryPositionSubsidies += positionBonus;
        }

        // Step 2: Apply cross-subsidy calculation to remaining amount
        uint256 crossSubsidy = _calculateSecondaryCrossSubsidy(remainingAmount);
        uint256 collateral = remainingAmount - crossSubsidy;

        if (crossSubsidy > 0) {
            primaryPrizePoolSubsidy += crossSubsidy;
            secondaryToPrimarySubsidy[msg.sender][entryId] += crossSubsidy;
        }

        // Track deposits per entry (for withdrawal refunds)
        secondaryDepositedPerEntry[msg.sender][entryId] += amount;

        // Get current LMSR price
        uint256 price = calculateSecondaryPrice(entryId);

        // Calculate tokens to mint from collateral (after bonus and cross-subsidy)
        uint256 tokensToMint = (collateral * PRICE_PRECISION) / price;

        // Mint ERC1155 tokens (token ID = entry ID)
        _mint(msg.sender, entryId, tokensToMint, "");

        // Update demand tracking
        netPosition[entryId] += int256(tokensToMint);
        secondaryPrizePool += collateral;

        // Pull payment from secondary participant
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        emit SecondaryPositionAdded(msg.sender, entryId, amount, tokensToMint);
    }

    /**
     * @notice Secondary participant removes their position (burns tokens, gets 100% refund)
     * @param entryId Which entry to withdraw from
     * @param tokenAmount Amount of tokens to burn
     *
     * @dev Works in:
     * - OPEN state (during registration, before competition starts)
     * - CANCELLED state (full refund anytime)
     *
     * @dev NOT allowed in ACTIVE state - once competition starts, positions are locked
     */
    function removeSecondaryPosition(uint256 entryId, uint256 tokenAmount) external nonReentrant {
        require(
            state == ContestState.OPEN || state == ContestState.CANCELLED,
            "Cannot withdraw - competition started or settled"
        );

        require(entryOwner[entryId] != address(0), "Entry does not exist");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender, entryId) >= tokenAmount, "Insufficient balance");

        // Calculate what portion of user's deposit this represents
        uint256 userTotalTokens = balanceOf(msg.sender, entryId);
        uint256 depositedOnEntry = secondaryDepositedPerEntry[msg.sender][entryId];
        uint256 refundAmount = (depositedOnEntry * tokenAmount) / userTotalTokens;

        // Reverse oracle fee
        uint256 oracleFee = _calculateOracleFee(refundAmount);
        accumulatedOracleFee -= oracleFee;
        uint256 amountAfterFee = refundAmount - oracleFee;

        // Step 1: Reverse position bonus allocation
        uint256 positionBonus = (amountAfterFee * positionBonusShareBps) / BPS_DENOMINATOR;
        uint256 remainingAmount = amountAfterFee - positionBonus;

        if (positionBonus > 0) {
            primaryPositionSubsidy[entryId] -= positionBonus;
            totalPrimaryPositionSubsidies -= positionBonus;
        }

        // Step 2: Reverse cross-subsidy from remaining amount
        uint256 userCrossSubsidy = secondaryToPrimarySubsidy[msg.sender][entryId];
        uint256 crossRefund = (userCrossSubsidy * tokenAmount) / userTotalTokens;
        if (crossRefund > remainingAmount) {
            crossRefund = remainingAmount;
        }
        uint256 collateral = remainingAmount - crossRefund;

        // Burn tokens
        _burn(msg.sender, entryId, tokenAmount);
        netPosition[entryId] -= int256(tokenAmount);

        // Reverse collateral
        secondaryPrizePool -= collateral;
        secondaryDepositedPerEntry[msg.sender][entryId] -= refundAmount;

        if (crossRefund > 0) {
            primaryPrizePoolSubsidy -= crossRefund;
            secondaryToPrimarySubsidy[msg.sender][entryId] -= crossRefund;
        }

        // Refund 100% of what they deposited for these tokens
        paymentToken.safeTransfer(msg.sender, refundAmount);

        emit SecondaryPositionRemoved(msg.sender, refundAmount);
    }

    /**
     * @notice Secondary participant claims their payout (winner-take-all)
     * @param entryId The entry to claim
     */
    function claimSecondaryPayout(uint256 entryId) external nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(secondaryMarketResolved, "Market not resolved");
        require(entryOwner[entryId] != address(0), "Entry does not exist or was withdrawn");

        uint256 balance = balanceOf(msg.sender, entryId);
        require(balance > 0, "No tokens");

        // Burn user tokens first
        _burn(msg.sender, entryId, balance);

        uint256 payout = 0;

        // Winner-take-all: only winning entry gets paid
        if (entryId == secondaryWinningEntry) {
            // Capture supply BEFORE decrement for proportional payout
            uint256 totalSupplyBefore = uint256(netPosition[entryId]);
            require(totalSupplyBefore > 0, "No supply");

            // Winners split ALL secondary collateral (base + subsidy)
            uint256 totalSecondaryFunds = secondaryPrizePool + secondaryPrizePoolSubsidy;
            payout = (balance * totalSecondaryFunds) / totalSupplyBefore;

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
                // Reduce pools proportionally (mirror primary claim logic)
                if (totalSecondaryFunds > 0) {
                    uint256 fromBasePool = (payout * secondaryPrizePool) / totalSecondaryFunds;
                    uint256 fromSubsidyPool = payout - fromBasePool;

                    if (fromBasePool <= secondaryPrizePool) {
                        secondaryPrizePool -= fromBasePool;
                    } else {
                        secondaryPrizePool = 0;
                    }

                    if (fromSubsidyPool <= secondaryPrizePoolSubsidy) {
                        secondaryPrizePoolSubsidy -= fromSubsidyPool;
                    } else {
                        secondaryPrizePoolSubsidy = 0;
                    }
                }
                paymentToken.safeTransfer(msg.sender, payout);
            }

            // If this was the last claim (no supply remains), sweep any dust to the last claimant
            uint256 remainingSupply = uint256(netPosition[entryId]);
            if (remainingSupply == 0) {
                uint256 remaining = paymentToken.balanceOf(address(this));
                if (remaining > 0) {
                    secondaryPrizePool = 0;
                    secondaryPrizePoolSubsidy = 0;
                    paymentToken.safeTransfer(msg.sender, remaining);
                }
            }
        }

        emit SecondaryPayoutClaimed(msg.sender, entryId, payout);
    }

    // ============ Oracle State Management Functions ============

    /**
     * @notice Oracle activates contest (closes entry registration, secondary positions continue)
     */
    function activateContest() external onlyOracle {
        require(state == ContestState.OPEN, "Contest already started");
        require(entries.length > 0, "No entries");

        state = ContestState.ACTIVE;

        emit ContestActivated();
    }

    /**
     * @notice Oracle locks contest (closes secondary positions before contest ends)
     * @dev Prevents last-second positions when outcome is nearly certain
     *
     * Use case: Lock contest when final round starts, before results are known
     * This prevents unfair late positions and potential race conditions
     */
    function lockContest() external onlyOracle {
        require(state == ContestState.ACTIVE, "Contest not active");

        state = ContestState.LOCKED;

        emit ContestLocked();
    }

    /**
     * @notice Oracle settles contest - pure accounting (no transfers)
     * @param winningEntries Array of winning entry IDs (only entries with payouts > 0)
     * @param payoutBps Array of payout basis points (must sum to 10000)
     * @dev First entry in winningEntries is the overall winner (for secondary market)
     * @dev Entries not included are assumed to have 0% payout
     * @dev Position bonuses already accumulated per-deposit, settlement only distributes prize pool
     * @dev All payouts stored for later claims - NO transfers in this function
     */
    function settleContest(uint256[] calldata winningEntries, uint256[] calldata payoutBps)
        external
        onlyOracle
        nonReentrant
    {
        require(state == ContestState.ACTIVE || state == ContestState.LOCKED, "Contest not active or locked");
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

        // Calculate Layer 1 prize pool: primary deposits + cross-subsidy from secondary
        // Note: primaryPositionSubsidy already accumulated per-deposit during addSecondaryPosition()
        // Note: Primary→secondary subsidy (in secondaryPrizePool) backs ERC1155 tokens (winner-take-all)
        uint256 layer1Pool = primaryPrizePool + primaryPrizePoolSubsidy;

        // Distribute payouts to winners (proportional to payoutBps)
        // Pools remain unchanged - they're reduced proportionally during claims
        for (uint256 i = 0; i < winningEntries.length; i++) {
            uint256 entryId = winningEntries[i];
            uint256 payout = (layer1Pool * payoutBps[i]) / BPS_DENOMINATOR;
            primaryPrizePoolPayouts[entryId] = payout;
        }

        // Step 4: Set Layer 2 winner (winner-take-all)
        secondaryWinningEntry = winningEntries[0];
        secondaryMarketResolved = true;

        // Step 5: Handle edge case - no ERC1155 supply on winning entry
        // Add secondary pool (base + subsidy) to winning primary participants' payouts
        uint256 winnerSupply = uint256(netPosition[secondaryWinningEntry]);
        uint256 totalSecondaryFunds = secondaryPrizePool + secondaryPrizePoolSubsidy;
        if (totalSecondaryFunds > 0 && winnerSupply == 0) {
            uint256 poolToDistribute = totalSecondaryFunds;
            secondaryPrizePool = 0;
            secondaryPrizePoolSubsidy = 0;
            uint256 distributed = 0;
            for (uint256 i = 0; i < winningEntries.length; i++) {
                uint256 entryId = winningEntries[i];
                uint256 extra = (poolToDistribute * payoutBps[i]) / BPS_DENOMINATOR;
                if (extra > 0) {
                    distributed += extra;
                    primaryPrizePoolPayouts[entryId] += extra;
                }
            }
            // Send any rounding remainder to the top winner
            if (distributed < poolToDistribute) {
                uint256 remainder = poolToDistribute - distributed;
                primaryPrizePoolPayouts[winningEntries[0]] += remainder;
            }
        }

        emit ContestSettled(winningEntries, payoutBps);
    }

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
     * @notice Close contest and sweep remaining unclaimed funds to treasury after expiry
     * @dev Can only be called after expiryTimestamp
     * @dev Sweeps any remaining balance to oracle address
     */
    function closeContest() external onlyOracle nonReentrant {
        require(block.timestamp >= expiryTimestamp, "Expiry not reached");

        uint256 remaining = paymentToken.balanceOf(address(this));
        if (remaining > 0) {
            // Zero out all accounting (effects before interactions)
            primaryPrizePool = 0;
            primaryPrizePoolSubsidy = 0;
            totalPrimaryPositionSubsidies = 0;
            secondaryPrizePool = 0;
            secondaryPrizePoolSubsidy = 0;
            accumulatedOracleFee = 0;

            state = ContestState.CLOSED;

            // Transfer remaining funds to oracle (interaction)
            paymentToken.safeTransfer(oracle, remaining);

            emit ContestClosed();
        }
    }

    // ============ Oracle Functions ============

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
     * @notice Oracle sets merkle root for primary position whitelist
     * @param _root Merkle root hash (bytes32(0) to disable gating)
     */
    function setPrimaryMerkleRoot(bytes32 _root) external onlyOracle {
        primaryMerkleRoot = _root;
        emit PrimaryMerkleRootUpdated(_root);
    }

    /**
     * @notice Oracle sets merkle root for secondary position whitelist
     * @param _root Merkle root hash (bytes32(0) to disable gating)
     */
    function setSecondaryMerkleRoot(bytes32 _root) external onlyOracle {
        secondaryMerkleRoot = _root;
        emit SecondaryMerkleRootUpdated(_root);
    }

    // ============ Cancellation & Refunds ============

    /**
     * @notice Anyone can cancel if expired and not settled
     */
    function cancelExpired() external {
        require(block.timestamp >= expiryTimestamp, "Not expired");
        require(state != ContestState.SETTLED && state != ContestState.CLOSED, "Already settled");
        state = ContestState.CANCELLED;
        emit ContestCancelled();
    }

    // ============ Fee Calculation Helpers ============

    function _currentPrimarySideBalance() internal view returns (uint256) {
        return primaryPrizePool + primaryPrizePoolSubsidy + totalPrimaryPositionSubsidies;
    }

    function _calculatePrimaryCrossSubsidy(uint256 netAmount) internal view returns (uint256) {
        if (netAmount == 0 || maxCrossSubsidyBps == 0) {
            return 0;
        }

        uint256 primaryBefore = _currentPrimarySideBalance();
        uint256 secondaryBefore = secondaryPrizePool + secondaryPrizePoolSubsidy;
        uint256 total = primaryBefore + secondaryBefore + netAmount;
        if (total == 0) {
            return 0;
        }

        uint256 targetPrimary = (total * targetPrimaryShareBps) / BPS_DENOMINATOR;

        if (primaryBefore + netAmount <= targetPrimary) {
            return 0;
        }

        uint256 desired = primaryBefore + netAmount - targetPrimary;
        uint256 maxSubsidy = (netAmount * maxCrossSubsidyBps) / BPS_DENOMINATOR;

        if (desired > maxSubsidy) {
            desired = maxSubsidy;
        }
        if (desired > netAmount) {
            desired = netAmount;
        }

        return desired;
    }

    function _calculateSecondaryCrossSubsidy(uint256 netAmount) internal view returns (uint256) {
        if (netAmount == 0 || maxCrossSubsidyBps == 0) {
            return 0;
        }

        uint256 primaryBefore = _currentPrimarySideBalance();
        uint256 secondaryBefore = secondaryPrizePool + secondaryPrizePoolSubsidy;
        uint256 total = primaryBefore + secondaryBefore + netAmount;
        if (total == 0) {
            return 0;
        }

        uint256 targetPrimary = (total * targetPrimaryShareBps) / BPS_DENOMINATOR;

        if (targetPrimary <= primaryBefore) {
            return 0;
        }

        uint256 desired = targetPrimary - primaryBefore;
        uint256 maxSubsidy = (netAmount * maxCrossSubsidyBps) / BPS_DENOMINATOR;

        if (desired > maxSubsidy) {
            desired = maxSubsidy;
        }
        if (desired > netAmount) {
            desired = netAmount;
        }

        return desired;
    }

    /**
     * @notice Calculate current LMSR price for an entry
     * @param entryId The entry to get price for
     * @return Current price per token
     */
    function calculateSecondaryPrice(uint256 entryId) public view returns (uint256) {
        require(entryOwner[entryId] != address(0), "Entry does not exist or withdrawn");

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
     * @notice Calculate secondary deposit split into prize share, position share, and collateral
     * @param amount Total deposit amount
     * @return prizeShare Amount going to prize pool subsidy
     * @return positionShare Amount going to primary position bonus
     * @return collateral Amount backing secondary position tokens
     */
    /**
     * @notice Calculate oracle fee from an amount
     * @param amount Amount to calculate fee on
     * @return fee Oracle fee amount
     */
    function _calculateOracleFee(uint256 amount) internal view returns (uint256 fee) {
        fee = (amount * oracleFeeBps) / BPS_DENOMINATOR;
    }

    // ============ Optional Push Functions (Convenience) ============

    /**
     * @notice Push primary payouts (prize + bonus) to specific entries
     * @param entryIds Array of entry IDs to push payouts for
     * @dev Oracle can use this to help users who forgot to claim
     * @dev Gas-efficient: oracle controls which entries to push
     */
    function pushPrimaryPayouts(uint256[] calldata entryIds) external onlyOracle nonReentrant {
        require(state == ContestState.SETTLED, "Contest not settled");

        for (uint256 i = 0; i < entryIds.length; i++) {
            uint256 entryId = entryIds[i];
            address owner = entryOwner[entryId];
            require(owner != address(0), "Entry withdrawn or invalid");

            uint256 payout = primaryPrizePoolPayouts[entryId];
            uint256 bonus = primaryPositionSubsidy[entryId];
            uint256 totalClaim = payout + bonus;

            if (totalClaim > 0) {
                primaryPrizePoolPayouts[entryId] = 0;
                if (bonus > 0) {
                    primaryPositionSubsidy[entryId] = 0;
                    totalPrimaryPositionSubsidies -= bonus;
                }

                // Reduce pools proportionally (if payout > 0)
                if (payout > 0) {
                    uint256 totalPrimaryFunds = primaryPrizePool + primaryPrizePoolSubsidy;
                    if (totalPrimaryFunds > 0) {
                        uint256 fromBasePool = (payout * primaryPrizePool) / totalPrimaryFunds;
                        uint256 fromSubsidyPool = payout - fromBasePool;

                        primaryPrizePool = primaryPrizePool >= fromBasePool ? primaryPrizePool - fromBasePool : 0;
                        primaryPrizePoolSubsidy =
                            primaryPrizePoolSubsidy >= fromSubsidyPool ? primaryPrizePoolSubsidy - fromSubsidyPool : 0;
                    }
                }

                paymentToken.safeTransfer(owner, totalClaim);
                emit PrimaryPayoutClaimed(owner, entryId, totalClaim);
            }
        }
    }

    /**
     * @notice Push secondary payouts to specific addresses
     * @param participantAddresses Array of secondary participant addresses to push payouts for
     * @param entryId The winning entry ID (should be secondaryWinningEntry)
     * @dev Oracle can use this to help secondary participants who forgot to claim
     * @dev Gas-efficient: oracle controls which participants to push
     */
    function pushSecondaryPayouts(address[] calldata participantAddresses, uint256 entryId)
        external
        onlyOracle
        nonReentrant
    {
        require(state == ContestState.SETTLED, "Contest not settled");
        require(secondaryMarketResolved, "Market not resolved");
        require(entryId == secondaryWinningEntry, "Not winning entry");

        uint256 totalSupplyBefore = uint256(netPosition[entryId]);
        require(totalSupplyBefore > 0, "No supply");

        uint256 totalSecondaryFunds = secondaryPrizePool + secondaryPrizePoolSubsidy;

        for (uint256 i = 0; i < participantAddresses.length; i++) {
            address participant = participantAddresses[i];
            uint256 balance = balanceOf(participant, entryId);

            if (balance > 0) {
                _burn(participant, entryId, balance);
                netPosition[entryId] -= int256(balance);

                uint256 payout = (balance * totalSecondaryFunds) / totalSupplyBefore;

                if (payout > 0) {
                    // Reduce pools proportionally
                    if (totalSecondaryFunds > 0) {
                        uint256 fromBasePool = (payout * secondaryPrizePool) / totalSecondaryFunds;
                        uint256 fromSubsidyPool = payout - fromBasePool;

                        if (fromBasePool <= secondaryPrizePool) {
                            secondaryPrizePool -= fromBasePool;
                        } else {
                            secondaryPrizePool = 0;
                        }

                        if (fromSubsidyPool <= secondaryPrizePoolSubsidy) {
                            secondaryPrizePoolSubsidy -= fromSubsidyPool;
                        } else {
                            secondaryPrizePoolSubsidy = 0;
                        }
                    }
                    paymentToken.safeTransfer(participant, payout);
                    emit SecondaryPayoutClaimed(participant, entryId, payout);
                }
            }
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

    function getPrimarySideBalance() external view returns (uint256) {
        return _currentPrimarySideBalance();
    }

    function getSecondarySideBalance() external view returns (uint256) {
        return secondaryPrizePool + secondaryPrizePoolSubsidy;
    }

    function getPrimarySideShareBps() external view returns (uint256) {
        uint256 primaryBalance = _currentPrimarySideBalance();
        uint256 secondaryBalance = secondaryPrizePool + secondaryPrizePoolSubsidy;
        uint256 total = primaryBalance + secondaryBalance;
        if (total == 0) {
            return 0;
        }
        return (primaryBalance * BPS_DENOMINATOR) / total;
    }
}
