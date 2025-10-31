// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PlatformToken.sol";
import "../src/DepositManager.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockCompound.sol";

contract PlatformTokenTest is Test {
    PlatformToken public platformToken;
    DepositManager public depositManager;
    MockUSDC public usdcToken;
    MockCompound public mockCompound;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    // Events to test
    event DepositManagerSet(address indexed depositManager);
    event DepositManagerMint(address indexed to, uint256 amount);
    event DepositManagerBurn(address indexed from, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        // Deploy mock contracts
        usdcToken = new MockUSDC();
        mockCompound = new MockCompound(address(usdcToken));
        platformToken = new PlatformToken("Cut Platform Token", "CUT");
        depositManager = new DepositManager(address(usdcToken), address(platformToken), address(mockCompound));

        // Set up permissions
        platformToken.setDepositManager(address(depositManager));
    }

    // ============ CONSTRUCTOR TESTS ============

    function testConstructor() public view {
        assertEq(platformToken.name(), "Cut Platform Token");
        assertEq(platformToken.symbol(), "CUT");
        assertEq(platformToken.decimals(), 18);
        assertEq(platformToken.totalSupply(), 0);
        assertEq(platformToken.owner(), owner);
    }

    function testInitialState() public view {
        assertEq(platformToken.name(), "Cut Platform Token");
        assertEq(platformToken.symbol(), "CUT");
        assertEq(platformToken.decimals(), 18);
        assertEq(platformToken.totalSupply(), 0);
        assertEq(platformToken.depositManager(), address(depositManager));
    }

    // ============ DEPOSIT MANAGER SETTING TESTS ============

    function testSetDepositManager() public {
        address newDepositManager = address(0x999);

        vm.expectEmit(true, false, false, true);
        emit DepositManagerSet(newDepositManager);

        platformToken.setDepositManager(newDepositManager);
        assertEq(platformToken.depositManager(), newDepositManager);
    }

    function testSetDepositManagerOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        platformToken.setDepositManager(address(0x999));
    }

    function testSetDepositManagerZeroAddress() public {
        vm.expectRevert("Invalid depositManager address");
        platformToken.setDepositManager(address(0));
    }

    function testSetDepositManagerMultipleTimes() public {
        address newDepositManager1 = address(0x999);
        address newDepositManager2 = address(0x888);

        platformToken.setDepositManager(newDepositManager1);
        assertEq(platformToken.depositManager(), newDepositManager1);

        platformToken.setDepositManager(newDepositManager2);
        assertEq(platformToken.depositManager(), newDepositManager2);
    }

    // ============ MINTING TESTS ============

    function testMintByDepositManager() public {
        uint256 amount = 1000 * 1e18;

        vm.expectEmit(true, false, false, true);
        emit DepositManagerMint(user1, amount);

        // Mint through DepositManager (which has permission)
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        assertEq(platformToken.balanceOf(user1), amount);
        assertEq(platformToken.totalSupply(), amount);
    }

    function testMintByNonDepositManager() public {
        vm.prank(user1);
        vm.expectRevert("Only depositManager can call this function");
        platformToken.mint(user2, 1000 * 1e18);
    }

    function testMintWhenDepositManagerNotSet() public {
        // Deploy new token without setting depositManager
        PlatformToken newToken = new PlatformToken("Cut Platform Token", "CUT");

        vm.prank(address(depositManager));
        vm.expectRevert("DepositManager not set");
        newToken.mint(user1, 1000 * 1e18);
    }

    function testMintToZeroAddress() public {
        vm.prank(address(depositManager));
        vm.expectRevert("Cannot mint to zero address");
        platformToken.mint(address(0), 1000 * 1e18);
    }

    function testMintZeroAmount() public {
        vm.prank(address(depositManager));
        vm.expectRevert("Amount must be greater than 0");
        platformToken.mint(user1, 0);
    }

    function testMintLargeAmount() public {
        uint256 largeAmount = type(uint256).max / 2;

        vm.prank(address(depositManager));
        platformToken.mint(user1, largeAmount);

        assertEq(platformToken.balanceOf(user1), largeAmount);
        assertEq(platformToken.totalSupply(), largeAmount);
    }

    function testMintMultipleTimes() public {
        uint256 amount1 = 1000 * 1e18;
        uint256 amount2 = 2000 * 1e18;

        vm.prank(address(depositManager));
        platformToken.mint(user1, amount1);

        vm.prank(address(depositManager));
        platformToken.mint(user1, amount2);

        assertEq(platformToken.balanceOf(user1), amount1 + amount2);
        assertEq(platformToken.totalSupply(), amount1 + amount2);
    }

    function testMintToMultipleUsers() public {
        uint256 amount = 1000 * 1e18;

        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        vm.prank(address(depositManager));
        platformToken.mint(user2, amount);

        assertEq(platformToken.balanceOf(user1), amount);
        assertEq(platformToken.balanceOf(user2), amount);
        assertEq(platformToken.totalSupply(), amount * 2);
    }

    // ============ BURNING TESTS ============

    function testBurnByDepositManager() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        vm.expectEmit(true, false, false, true);
        emit DepositManagerBurn(user1, amount);

        // Then burn through DepositManager
        vm.prank(address(depositManager));
        platformToken.burn(user1, amount);

        assertEq(platformToken.balanceOf(user1), 0);
        assertEq(platformToken.totalSupply(), 0);
    }

    function testBurnByNonDepositManager() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        // Try to burn without permission
        vm.prank(user1);
        vm.expectRevert("Only depositManager can call this function");
        platformToken.burn(user1, amount);
    }

    function testBurnWhenDepositManagerNotSet() public {
        // Deploy new token without setting depositManager
        PlatformToken newToken = new PlatformToken("Cut Platform Token", "CUT");

        vm.prank(address(depositManager));
        vm.expectRevert("DepositManager not set");
        newToken.burn(user1, 1000 * 1e18);
    }

    function testBurnFromZeroAddress() public {
        vm.prank(address(depositManager));
        vm.expectRevert("Cannot burn from zero address");
        platformToken.burn(address(0), 1000 * 1e18);
    }

    function testBurnZeroAmount() public {
        vm.prank(address(depositManager));
        vm.expectRevert("Amount must be greater than 0");
        platformToken.burn(user1, 0);
    }

    function testBurnInsufficientBalance() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        // Try to burn more than available
        vm.prank(address(depositManager));
        vm.expectRevert("Insufficient balance to burn");
        platformToken.burn(user1, amount + 1);
    }

    function testBurnPartialBalance() public {
        uint256 mintAmount = 1000 * 1e18;
        uint256 burnAmount = 300 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, mintAmount);

        // Burn partial amount
        vm.prank(address(depositManager));
        platformToken.burn(user1, burnAmount);

        assertEq(platformToken.balanceOf(user1), mintAmount - burnAmount);
        assertEq(platformToken.totalSupply(), mintAmount - burnAmount);
    }

    function testBurnMultipleTimes() public {
        uint256 mintAmount = 1000 * 1e18;
        uint256 burnAmount1 = 300 * 1e18;
        uint256 burnAmount2 = 200 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, mintAmount);

        // Burn multiple times
        vm.prank(address(depositManager));
        platformToken.burn(user1, burnAmount1);

        vm.prank(address(depositManager));
        platformToken.burn(user1, burnAmount2);

        assertEq(platformToken.balanceOf(user1), mintAmount - burnAmount1 - burnAmount2);
        assertEq(platformToken.totalSupply(), mintAmount - burnAmount1 - burnAmount2);
    }

    // ============ ERC20 TRANSFER TESTS ============

    function testTransfer() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        uint256 transferAmount = amount / 2;

        vm.expectEmit(true, true, false, true);
        emit Transfer(user1, user2, transferAmount);

        // Transfer tokens
        vm.prank(user1);
        platformToken.transfer(user2, transferAmount);

        assertEq(platformToken.balanceOf(user1), amount - transferAmount);
        assertEq(platformToken.balanceOf(user2), transferAmount);
    }

    function testTransferToZeroAddress() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        vm.prank(user1);
        vm.expectRevert();
        platformToken.transfer(address(0), amount);
    }

    function testTransferInsufficientBalance() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        vm.prank(user1);
        vm.expectRevert();
        platformToken.transfer(user2, amount + 1);
    }

    function testTransferFrom() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        uint256 transferAmount = amount / 2;

        // Approve and transfer
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Approval(user1, user2, transferAmount);
        platformToken.approve(user2, transferAmount);

        vm.prank(user2);
        vm.expectEmit(true, true, false, true);
        emit Transfer(user1, user3, transferAmount);
        platformToken.transferFrom(user1, user3, transferAmount);

        assertEq(platformToken.balanceOf(user1), amount - transferAmount);
        assertEq(platformToken.balanceOf(user3), transferAmount);
        assertEq(platformToken.allowance(user1, user2), 0);
    }

    function testTransferFromInsufficientAllowance() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        // Approve less than transfer amount
        vm.prank(user1);
        platformToken.approve(user2, amount / 2);

        vm.prank(user2);
        vm.expectRevert();
        platformToken.transferFrom(user1, user3, amount);
    }

    function testTransferFromInsufficientBalance() public {
        uint256 amount = 1000 * 1e18;

        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        // Approve more than balance
        vm.prank(user1);
        platformToken.approve(user2, amount + 1);

        vm.prank(user2);
        vm.expectRevert();
        platformToken.transferFrom(user1, user3, amount + 1);
    }

    // ============ APPROVAL TESTS ============

    function testApprove() public {
        uint256 amount = 1000 * 1e18;

        vm.expectEmit(true, true, false, true);
        emit Approval(user1, user2, amount);

        vm.prank(user1);
        platformToken.approve(user2, amount);

        assertEq(platformToken.allowance(user1, user2), amount);
    }

    function testApproveZeroAddress() public {
        uint256 amount = 1000 * 1e18;

        vm.prank(user1);
        vm.expectRevert();
        platformToken.approve(address(0), amount);
    }

    function testApproveMultipleTimes() public {
        uint256 amount1 = 1000 * 1e18;
        uint256 amount2 = 2000 * 1e18;

        vm.prank(user1);
        platformToken.approve(user2, amount1);
        assertEq(platformToken.allowance(user1, user2), amount1);

        vm.prank(user1);
        platformToken.approve(user2, amount2);
        assertEq(platformToken.allowance(user1, user2), amount2);
    }

    // ============ EDGE CASES AND STRESS TESTS ============

    function testMintAndBurnCycle() public {
        uint256 amount = 1000 * 1e18;

        // Mint
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        assertEq(platformToken.balanceOf(user1), amount);
        assertEq(platformToken.totalSupply(), amount);

        // Burn
        vm.prank(address(depositManager));
        platformToken.burn(user1, amount);
        assertEq(platformToken.balanceOf(user1), 0);
        assertEq(platformToken.totalSupply(), 0);

        // Mint again
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        assertEq(platformToken.balanceOf(user1), amount);
        assertEq(platformToken.totalSupply(), amount);
    }

    function testMultipleUsersComplexScenario() public {
        uint256 amount1 = 1000 * 1e18;
        uint256 amount2 = 2000 * 1e18;
        uint256 amount3 = 500 * 1e18;

        // Mint to multiple users
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount1);

        vm.prank(address(depositManager));
        platformToken.mint(user2, amount2);

        vm.prank(address(depositManager));
        platformToken.mint(user3, amount3);

        // Transfer between users
        vm.prank(user1);
        platformToken.transfer(user2, amount1 / 2);

        vm.prank(user2);
        platformToken.transfer(user3, amount2 / 4);

        // Burn from users
        vm.prank(address(depositManager));
        platformToken.burn(user1, amount1 / 4);

        vm.prank(address(depositManager));
        platformToken.burn(user2, amount2 / 8);

        // Verify final balances
        assertEq(platformToken.balanceOf(user1), amount1 / 4); // 250
        assertEq(platformToken.balanceOf(user2), amount2 * 7 / 8); // 1750 (2000 - 250)
        assertEq(platformToken.balanceOf(user3), amount3 + amount2 / 4); // 1000 (500 + 500)

        // Calculate expected total: 250 + 1750 + 1000 = 3000
        uint256 expectedTotal = amount1 / 4 + amount2 * 7 / 8 + (amount3 + amount2 / 4);
        assertEq(platformToken.totalSupply(), expectedTotal);
    }

    function testGasOptimization() public {
        uint256 amount = 1000 * 1e18;

        // Test gas usage for mint
        uint256 gasBefore = gasleft();
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        uint256 gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (less than 100k for simple mint)
        assertLt(gasUsed, 100000);

        // Test gas usage for transfer
        gasBefore = gasleft();
        vm.prank(user1);
        platformToken.transfer(user2, amount / 2);
        gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (less than 100k for simple transfer)
        assertLt(gasUsed, 100000);
    }

    // ============ REVERT SCENARIOS ============

    function testRevertOnDepositManagerNotSet() public {
        PlatformToken newToken = new PlatformToken("Cut Platform Token", "CUT");

        vm.prank(address(depositManager));
        vm.expectRevert("DepositManager not set");
        newToken.mint(user1, 1000 * 1e18);

        vm.prank(address(depositManager));
        vm.expectRevert("DepositManager not set");
        newToken.burn(user1, 1000 * 1e18);
    }

    function testRevertOnInvalidDepositManagerCall() public {
        vm.prank(user1);
        vm.expectRevert("Only depositManager can call this function");
        platformToken.mint(user2, 1000 * 1e18);

        vm.prank(user1);
        vm.expectRevert("Only depositManager can call this function");
        platformToken.burn(user2, 1000 * 1e18);
    }

    // ============ VIEW FUNCTION TESTS ============

    function testViewFunctions() public view {
        assertEq(platformToken.name(), "Cut Platform Token");
        assertEq(platformToken.symbol(), "CUT");
        assertEq(platformToken.decimals(), 18);
        assertEq(platformToken.depositManager(), address(depositManager));
        assertEq(platformToken.owner(), owner);
    }

    function testBalanceOf() public {
        uint256 amount = 1000 * 1e18;

        assertEq(platformToken.balanceOf(user1), 0);

        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);

        assertEq(platformToken.balanceOf(user1), amount);
    }

    function testAllowance() public {
        uint256 amount = 1000 * 1e18;

        assertEq(platformToken.allowance(user1, user2), 0);

        vm.prank(user1);
        platformToken.approve(user2, amount);

        assertEq(platformToken.allowance(user1, user2), amount);
    }
}
