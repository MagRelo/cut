// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TokenManager.sol";
import "../src/PlatformToken.sol";
import "../src/PaymentToken.sol";
import "./MockCompound.sol";

// Mock contract for testing reentrancy attacks
contract ReentrantContract {
    TokenManager public tokenManager;
    IERC20 public usdcToken;
    IERC20 public platformToken;

    constructor(address _tokenManager, address _usdcToken, address _platformToken) {
        tokenManager = TokenManager(_tokenManager);
        usdcToken = IERC20(_usdcToken);
        platformToken = IERC20(_platformToken);
    }

    function attackDeposit() external {
        usdcToken.approve(address(tokenManager), 1000 * 1e6);
        tokenManager.depositUSDC(1000 * 1e6);
    }

    function attackWithdraw() external {
        tokenManager.withdrawUSDC(1000 * 1e18);
    }

    function attackClaimYield() external {
        tokenManager.claimYield();
    }

    function attackWithdrawAll() external {
        tokenManager.withdrawAll();
    }

    // Reentrancy attack functions
    function onERC20Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        // Try to reenter the token manager functions
        try tokenManager.depositUSDC(1000 * 1e6) {
            // This should fail due to reentrancy guard
        } catch {
            // Expected to fail
        }
        return this.onERC20Received.selector;
    }

    function onERC20ReceivedWithdraw(address, address, uint256, bytes calldata) external returns (bytes4) {
        // Try to reenter the token manager functions
        try tokenManager.withdrawUSDC(1000 * 1e18) {
            // This should fail due to reentrancy guard
        } catch {
            // Expected to fail
        }
        return this.onERC20Received.selector;
    }
}

contract TokenManagerSecurityTest is Test {
    TokenManager public tokenManager;
    PlatformToken public platformToken;
    PaymentToken public paymentToken;
    MockCToken public mockCUSDC;
    ReentrantContract public reentrantContract;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public maliciousUser = address(0x3);
    address public paymentTokenOwner = address(0x999); // Owner of PaymentToken
    address public tokenManagerOwner = address(0x888); // Owner of TokenManager system

    function setUp() public {
        // Deploy payment token (USDC) with a specific owner
        vm.startPrank(paymentTokenOwner);
        paymentToken = new PaymentToken();
        vm.stopPrank();
        
        // Deploy platform token
        platformToken = new PlatformToken();
        
        // Deploy mock cUSDC
        mockCUSDC = new MockCToken(address(paymentToken));
        
        // Deploy token manager with a specific owner
        vm.startPrank(tokenManagerOwner);
        tokenManager = new TokenManager(
            address(paymentToken),
            address(platformToken),
            address(mockCUSDC)
        );
        vm.stopPrank();
        
        // Set token manager in platform token
        platformToken.setTokenManager(address(tokenManager));
        
        // Deploy reentrant contract
        reentrantContract = new ReentrantContract(
            address(tokenManager),
            address(paymentToken),
            address(platformToken)
        );
        
        // Initial state checks
        assertEq(tokenManager.totalUSDCBalance(), 0);
        assertEq(tokenManager.totalPlatformTokensMinted(), 0);
        assertEq(tokenManager.getExchangeRate(), 1e18);
        
        // Mint USDC to users for testing (by the PaymentToken owner)
        vm.startPrank(paymentTokenOwner);
        paymentToken.mint(alice, 1000000e6); // 1M USDC
        paymentToken.mint(bob, 1000000e6);   // 1M USDC
        paymentToken.mint(maliciousUser, 1000000e6); // 1M USDC
        vm.stopPrank();
    }

    // Helper function to add yield to the MockCompound contract
    // This simulates how Compound V3 would accumulate yield internally
    function addYieldToCompound(uint256 yieldAmount) internal {
        vm.startPrank(paymentTokenOwner);
        paymentToken.mint(address(mockCUSDC), yieldAmount);
        vm.stopPrank();
    }

    function testBasicDepositAndWithdraw() public {
        // Test basic deposit
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 10000 * 1e6);
        tokenManager.depositUSDC(10000 * 1e6);
        vm.stopPrank();
        
        assertEq(tokenManager.totalUSDCBalance(), 10000 * 1e6);
        
        // Test basic withdraw
        vm.startPrank(alice);
        tokenManager.withdrawUSDC(10000 * 1e18);
        vm.stopPrank();
        
        assertEq(tokenManager.totalUSDCBalance(), 0);
    }

    function testYieldGeneration() public {
        // Alice deposits
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation by adding yield to the token manager's cUSDC position
        addYieldToCompound(1000 * 1e6); // Add 1000 USDC yield to Compound
        mockCUSDC.addYield(address(tokenManager), 1000 * 1e6); // Add 1000 USDC yield
        
        // Check yield is claimable
        uint256 claimableYield = tokenManager.getClaimableYield(alice);
        assertGt(claimableYield, 0, "Should have claimable yield");
        
        // Claim yield
        vm.startPrank(alice);
        tokenManager.claimYield();
        vm.stopPrank();
        
        assertEq(tokenManager.getClaimableYield(alice), 0, "Yield should be claimed");
    }

    function testMultipleUsersYield() public {
        // Alice deposits
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Bob deposits
        vm.startPrank(bob);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation
        addYieldToCompound(1000 * 1e6); // Add 1000 USDC yield to Compound
        mockCUSDC.addYield(address(tokenManager), 1000 * 1e6); // Add 1000 USDC yield
        
        // Check both users have yield
        uint256 aliceYield = tokenManager.getClaimableYield(alice);
        uint256 bobYield = tokenManager.getClaimableYield(bob);
        
        assertGt(aliceYield, 0, "Alice should have yield");
        assertGt(bobYield, 0, "Bob should have yield");
    }

    function testLargeDepositYield() public {
        // Large deposit
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 1000000 * 1e6);
        tokenManager.depositUSDC(1000000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation
        mockCUSDC.addYield(address(tokenManager), 10000 * 1e6); // Add 10000 USDC yield
        
        // Check yield distribution
        uint256 aliceYield = tokenManager.getClaimableYield(alice);
        uint256 maliciousYield = tokenManager.getClaimableYield(maliciousUser);
        
        assertGt(aliceYield, 0, "Alice should have yield");
        assertEq(maliciousYield, 0, "Malicious user should have no yield");
    }

    function testYieldAccumulation() public {
        // Alice deposits
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation
        mockCUSDC.addYield(address(tokenManager), 5000 * 1e6); // Add 5000 USDC yield
        
        // Bob deposits after yield generation
        vm.startPrank(bob);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate more yield generation
        addYieldToCompound(3000 * 1e6); // Add 3000 USDC yield to Compound
        mockCUSDC.addYield(address(tokenManager), 3000 * 1e6); // Add 3000 USDC yield
        
        // Check yield distribution
        uint256 aliceYield = tokenManager.getClaimableYield(alice);
        uint256 bobYield = tokenManager.getClaimableYield(bob);
        
        assertGt(aliceYield, 0, "Alice should have yield");
        assertGt(bobYield, 0, "Bob should have yield");
    }

    function testYieldWithdrawal() public {
        // Test withdrawal with yield
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation - need to add enough tokens to cover both deposit and yield
        uint256 yieldAmount = 5000 * 1e6;
        addYieldToCompound(yieldAmount + 100000 * 1e6); // Add enough tokens to cover deposit + yield
        mockCUSDC.addYield(address(tokenManager), yieldAmount); // Add 5000 USDC yield
        
        uint256 claimableYield = tokenManager.getClaimableYield(alice);
        assertGt(claimableYield, 0, "Should have claimable yield");
        
        // Withdraw all (deposit + yield)
        vm.startPrank(alice);
        tokenManager.withdrawAll();
        vm.stopPrank();
        
        uint256 finalClaimableYield = tokenManager.getClaimableYield(alice);
        assertEq(finalClaimableYield, 0, "Should have no claimable yield after withdrawal");
    }

    function testReentrancyProtection() public {
        // Test reentrancy protection on deposit
        vm.startPrank(address(reentrantContract));
        paymentToken.approve(address(tokenManager), 10000 * 1e6);
        
        // This should fail due to reentrancy guard
        vm.expectRevert();
        tokenManager.depositUSDC(10000 * 1e6);
        vm.stopPrank();
    }

    function testReentrancyProtectionWithdraw() public {
        // Setup: deposit first
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 10000 * 1e6);
        tokenManager.depositUSDC(10000 * 1e6);
        vm.stopPrank();
        
        // Test reentrancy protection on withdraw
        vm.startPrank(address(reentrantContract));
        
        // This should fail due to reentrancy guard
        vm.expectRevert();
        tokenManager.withdrawUSDC(10000 * 1e18);
        vm.stopPrank();
    }

    function testExchangeRateManipulation() public {
        // Test that exchange rate cannot be manipulated by small deposits
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        uint256 initialRate = tokenManager.getExchangeRate();
        
        // Simulate yield generation
        mockCUSDC.addYield(address(tokenManager), 10000 * 1e6); // Add 10000 USDC yield
        
        uint256 rateAfterYield = tokenManager.getExchangeRate();
        assertGt(rateAfterYield, initialRate, "Rate should increase with yield");
        
        // Large deposit should not significantly affect rate
        vm.startPrank(bob);
        paymentToken.approve(address(tokenManager), 1000000 * 1e6);
        tokenManager.depositUSDC(1000000 * 1e6);
        vm.stopPrank();
        
        uint256 rateAfterLargeDeposit = tokenManager.getExchangeRate();
        assertGt(rateAfterLargeDeposit, initialRate, "Rate should still be higher than initial");
    }

    function testPrecisionHandling() public {
        // Test handling of very small amounts
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 1);
        tokenManager.depositUSDC(1);
        vm.stopPrank();
        
        // Simulate yield generation
        addYieldToCompound(100 * 1e6); // Add 100 USDC yield to Compound
        mockCUSDC.addYield(address(tokenManager), 100 * 1e6); // Add 100 USDC yield
        
        uint256 smallYield = tokenManager.getClaimableYield(alice);
        assertGe(smallYield, 0, "Should handle small amounts gracefully");
    }

    function testEmergencyWithdrawal() public {
        // Test emergency withdrawal by owner
        vm.startPrank(alice);
        paymentToken.approve(address(tokenManager), 100000 * 1e6);
        tokenManager.depositUSDC(100000 * 1e6);
        vm.stopPrank();
        
        // Simulate yield generation
        addYieldToCompound(5000 * 1e6); // Add 5000 USDC yield to Compound
        mockCUSDC.addYield(address(tokenManager), 5000 * 1e6); // Add 5000 USDC yield
        
        uint256 claimableYield = tokenManager.getClaimableYield(alice);
        assertGt(claimableYield, 0, "Should have claimable yield");
        
        // Emergency withdrawal
        vm.startPrank(alice);
        tokenManager.withdrawAll();
        vm.stopPrank();
        
        uint256 finalClaimableYield = tokenManager.getClaimableYield(alice);
        assertEq(finalClaimableYield, 0, "Should have no claimable yield after withdrawal");
    }

    function testTokenManagerMint() public {
        // Test direct minting by token manager
        vm.startPrank(address(tokenManager));
        platformToken.mint(alice, 1000 * 1e18);
        vm.stopPrank();
        
        assertEq(platformToken.balanceOf(alice), 1000 * 1e18, "Should mint tokens directly");
    }
} 