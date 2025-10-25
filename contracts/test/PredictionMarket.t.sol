// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/Escrow.sol";
import "../src/mocks/MockUSDC.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public market;
    Escrow public escrow;
    MockUSDC public usdc;
    
    address public oracle = address(1);
    address public userA = address(2);
    address public userB = address(3);
    address public userC = address(4);
    address public spectatorX = address(5);
    address public spectatorY = address(6);
    
    uint256 public constant DEPOSIT_AMOUNT = 100e6; // 100 USDC
    uint256 public constant LIQUIDITY_PARAM = 1000e6; // 1000 USDC
    uint256 public constant EXPIRY = 365 days;
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy Layer 1 contest escrow
        escrow = new Escrow(
            DEPOSIT_AMOUNT,
            block.timestamp + EXPIRY,
            address(usdc),
            6, // USDC decimals
            oracle,
            100 // 1% oracle fee
        );
        
        // Users compete in contest
        usdc.mint(userA, DEPOSIT_AMOUNT);
        vm.startPrank(userA);
        usdc.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        usdc.mint(userB, DEPOSIT_AMOUNT);
        vm.startPrank(userB);
        usdc.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        usdc.mint(userC, DEPOSIT_AMOUNT);
        vm.startPrank(userC);
        usdc.approve(address(escrow), DEPOSIT_AMOUNT);
        escrow.deposit();
        vm.stopPrank();
        
        // Oracle closes deposits (locks participants)
        vm.prank(oracle);
        escrow.closeDeposits();
        
        // Deploy Layer 2 prediction market
        market = new PredictionMarket(
            address(escrow),
            LIQUIDITY_PARAM,
            oracle
        );
    }
    
    function testConstructor() public {
        assertEq(address(market.contestEscrow()), address(escrow));
        assertEq(address(market.paymentToken()), address(usdc));
        assertEq(market.oracle(), oracle);
        assertEq(market.numOutcomes(), 3);
        assertEq(market.liquidityParameter(), LIQUIDITY_PARAM);
        assertTrue(market.state() == PredictionMarket.MarketState.OPEN);
        
        // Check participant mappings
        assertEq(market.participantToOutcome(userA), 0);
        assertEq(market.participantToOutcome(userB), 1);
        assertEq(market.participantToOutcome(userC), 2);
        assertEq(market.outcomeToParticipant(0), userA);
        assertEq(market.outcomeToParticipant(1), userB);
        assertEq(market.outcomeToParticipant(2), userC);
    }
    
    function testDeposit() public {
        uint256 depositAmount = 50e6; // 50 USDC
        
        // Mint and approve
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        
        // Deposit
        market.deposit(depositAmount);
        vm.stopPrank();
        
        // Check complete set minted
        assertEq(market.balanceOf(spectatorX, 0), depositAmount); // User A outcome
        assertEq(market.balanceOf(spectatorX, 1), depositAmount); // User B outcome
        assertEq(market.balanceOf(spectatorX, 2), depositAmount); // User C outcome
        
        // Check collateral tracked
        assertEq(market.totalCollateral(), depositAmount);
        assertEq(usdc.balanceOf(address(market)), depositAmount);
    }
    
    function testDepositMultipleSpectators() public {
        uint256 depositAmount = 50e6;
        
        // Spectator X deposits
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        vm.stopPrank();
        
        // Spectator Y deposits
        usdc.mint(spectatorY, depositAmount * 2);
        vm.startPrank(spectatorY);
        usdc.approve(address(market), depositAmount * 2);
        market.deposit(depositAmount * 2);
        vm.stopPrank();
        
        // Check balances
        assertEq(market.balanceOf(spectatorX, 0), depositAmount);
        assertEq(market.balanceOf(spectatorY, 0), depositAmount * 2);
        assertEq(market.totalCollateral(), depositAmount * 3);
    }
    
    function testSwapOutcomes() public {
        uint256 depositAmount = 100e6;
        
        // Spectator deposits
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        
        // Swap User A tokens for User B tokens
        uint256 swapAmount = 50e6;
        uint256 balanceBefore = market.balanceOf(spectatorX, 1);
        
        market.swapOutcomes(0, 1, swapAmount); // Swap A → B
        
        vm.stopPrank();
        
        // Check User A tokens burned
        assertEq(market.balanceOf(spectatorX, 0), depositAmount - swapAmount);
        
        // Check User B tokens minted
        // First swap has zero cost (netPosition is 0), so receive full amount
        uint256 balanceAfter = market.balanceOf(spectatorX, 1);
        assertEq(balanceAfter - balanceBefore, swapAmount); // First swap: no cost
    }
    
    function testSwapOutcomesMultipleTimes() public {
        uint256 depositAmount = 300e6;
        
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        
        // First swap
        market.swapOutcomes(0, 1, 100e6); // A → B
        uint256 balanceAfterFirst = market.balanceOf(spectatorX, 1);
        
        // Second swap (should cost more due to increased demand)
        market.swapOutcomes(2, 1, 100e6); // C → B
        uint256 balanceAfterSecond = market.balanceOf(spectatorX, 1);
        
        vm.stopPrank();
        
        // Second swap should give fewer tokens (higher cost)
        uint256 firstSwapReceived = balanceAfterFirst - depositAmount;
        uint256 secondSwapReceived = balanceAfterSecond - balanceAfterFirst;
        assertLt(secondSwapReceived, firstSwapReceived);
    }
    
    function testCalculateLMSRCost() public {
        // Cost should be 0 when no net position
        uint256 cost1 = market.calculateLMSRCost(0, 1, 100e6);
        assertEq(cost1, 0);
        
        // After a swap, cost should increase
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        market.swapOutcomes(0, 1, 50e6);
        vm.stopPrank();
        
        // Cost for next swap should be higher
        uint256 cost2 = market.calculateLMSRCost(0, 1, 100e6);
        assertGt(cost2, cost1);
    }
    
    function testMergePositions() public {
        uint256 depositAmount = 100e6;
        
        // Spectator deposits
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        
        uint256 balanceBefore = usdc.balanceOf(spectatorX);
        
        // Merge complete set back to collateral
        uint256 mergeAmount = 50e6;
        market.mergePositions(mergeAmount);
        
        vm.stopPrank();
        
        // Check tokens burned
        assertEq(market.balanceOf(spectatorX, 0), depositAmount - mergeAmount);
        assertEq(market.balanceOf(spectatorX, 1), depositAmount - mergeAmount);
        assertEq(market.balanceOf(spectatorX, 2), depositAmount - mergeAmount);
        
        // Check collateral refunded
        assertEq(usdc.balanceOf(spectatorX), balanceBefore + mergeAmount);
        assertEq(market.totalCollateral(), depositAmount - mergeAmount);
    }
    
    function testCannotMergeIncompleteSet() public {
        uint256 depositAmount = 100e6;
        
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        
        // Swap away some tokens
        market.swapOutcomes(0, 1, 50e6);
        
        // Try to merge more than we have of outcome 0
        vm.expectRevert("Incomplete set");
        market.mergePositions(depositAmount);
        
        vm.stopPrank();
    }
    
    function testCloseMarket() public {
        vm.prank(oracle);
        market.closeMarket();
        
        assertTrue(market.state() == PredictionMarket.MarketState.CLOSED);
    }
    
    function testCannotDepositWhenClosed() public {
        vm.prank(oracle);
        market.closeMarket();
        
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        
        vm.expectRevert("Market not open");
        market.deposit(100e6);
        
        vm.stopPrank();
    }
    
    function testCannotSwapWhenClosed() public {
        // Deposit first
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        vm.stopPrank();
        
        // Close market
        vm.prank(oracle);
        market.closeMarket();
        
        // Try to swap
        vm.startPrank(spectatorX);
        vm.expectRevert("Market not open");
        market.swapOutcomes(0, 1, 50e6);
        vm.stopPrank();
    }
    
    function testFullFlow() public {
        // Phase 1: Spectator deposits
        uint256 depositAmount = 100e6;
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        
        // Phase 2: Spectator concentrates on User B (partial swaps to avoid exceeding collateral)
        market.swapOutcomes(0, 1, 50e6); // Swap half A tokens for B
        market.swapOutcomes(2, 1, 50e6); // Swap half C tokens for B
        vm.stopPrank();
        
        uint256 userBTokens = market.balanceOf(spectatorX, 1);
        assertGt(userBTokens, depositAmount); // Should have more than original 100 B tokens
        
        // Phase 3: Contest resolves (User B wins)
        address[] memory winners = new address[](3);
        winners[0] = userB; // 1st place
        winners[1] = userA; // 2nd place
        winners[2] = userC; // 3rd place
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000; // 60%
        payouts[1] = 3000; // 30%
        payouts[2] = 1000; // 10%
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        // Phase 4: Market resolves from escrow
        vm.prank(oracle);
        market.closeMarket();
        
        market.resolveFromEscrow();
        
        assertTrue(market.state() == PredictionMarket.MarketState.RESOLVED);
        
        // Phase 5: Spectator redeems
        uint256 balanceBefore = usdc.balanceOf(spectatorX);
        
        vm.prank(spectatorX);
        market.redeemPosition(1); // Redeem User B tokens
        
        uint256 balanceAfter = usdc.balanceOf(spectatorX);
        
        // Note: Due to LMSR swap costs, the payout is limited by available collateral
        // The spectator concentrated position but paid swap costs
        // So payout may be less than if they held diversified position
        assertGt(balanceAfter, balanceBefore); // Should receive something
    }
    
    function testResolveFromEscrow() public {
        // Resolve contest
        address[] memory winners = new address[](3);
        winners[0] = userB;
        winners[1] = userA;
        winners[2] = userC;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000; // 60%
        payouts[1] = 3000; // 30%
        payouts[2] = 1000; // 10%
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        // Close and resolve market
        vm.prank(oracle);
        market.closeMarket();
        
        market.resolveFromEscrow();
        
        // Check payout numerators set correctly
        assertEq(market.payoutNumerators(0), 3000); // User A (2nd) = 30%
        assertEq(market.payoutNumerators(1), 6000); // User B (1st) = 60%
        assertEq(market.payoutNumerators(2), 1000); // User C (3rd) = 10%
    }
    
    function testRedeemPosition() public {
        // Setup: Spectator deposits and swaps
        uint256 depositAmount = 100e6;
        usdc.mint(spectatorX, depositAmount);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), depositAmount);
        market.deposit(depositAmount);
        vm.stopPrank();
        
        // Resolve contest
        address[] memory winners = new address[](3);
        winners[0] = userB;
        winners[1] = userA;
        winners[2] = userC;
        
        uint256[] memory payouts = new uint256[](3);
        payouts[0] = 6000;
        payouts[1] = 3000;
        payouts[2] = 1000;
        
        vm.prank(oracle);
        escrow.distribute(winners, payouts);
        
        vm.prank(oracle);
        market.closeMarket();
        
        market.resolveFromEscrow();
        
        // Redeem User B tokens (1st place)
        uint256 balanceBefore = usdc.balanceOf(spectatorX);
        uint256 tokenBalance = market.balanceOf(spectatorX, 1);
        
        vm.prank(spectatorX);
        market.redeemPosition(1);
        
        uint256 balanceAfter = usdc.balanceOf(spectatorX);
        uint256 expectedPayout = (tokenBalance * 6000) / 10000;
        
        assertEq(balanceAfter - balanceBefore, expectedPayout);
        assertEq(market.balanceOf(spectatorX, 1), 0); // Tokens burned
    }
    
    function testCannotRedeemBeforeResolution() public {
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        
        vm.expectRevert("Market not resolved");
        market.redeemPosition(0);
        
        vm.stopPrank();
    }
    
    function testGetImpliedProbability() public {
        // Before any swaps, should be equal probability
        uint256 prob0 = market.getImpliedProbability(0);
        uint256 prob1 = market.getImpliedProbability(1);
        uint256 prob2 = market.getImpliedProbability(2);
        
        assertEq(prob0, prob1);
        assertEq(prob1, prob2);
        
        // After swaps, probabilities should change
        usdc.mint(spectatorX, 300e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 300e6);
        market.deposit(300e6);
        market.swapOutcomes(0, 1, 100e6);
        market.swapOutcomes(2, 1, 100e6);
        vm.stopPrank();
        
        uint256 newProb1 = market.getImpliedProbability(1);
        assertGt(newProb1, prob1); // User B should have higher implied probability
    }
    
    function testSwapRevertsOnInvalidInputs() public {
        usdc.mint(spectatorX, 100e6);
        vm.startPrank(spectatorX);
        usdc.approve(address(market), 100e6);
        market.deposit(100e6);
        
        // Cannot swap same outcome
        vm.expectRevert("Cannot swap same outcome");
        market.swapOutcomes(0, 0, 50e6);
        
        // Cannot swap invalid outcome ID
        vm.expectRevert("Invalid outcome ID");
        market.swapOutcomes(0, 5, 50e6);
        
        // Cannot swap more than balance
        vm.expectRevert("Insufficient balance");
        market.swapOutcomes(0, 1, 200e6);
        
        vm.stopPrank();
    }
}

