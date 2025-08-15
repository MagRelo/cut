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

    function setUp() public {
        // Deploy mock contracts
        usdcToken = new MockUSDC();
        mockCompound = new MockCompound(address(usdcToken));
        platformToken = new PlatformToken();
        depositManager = new DepositManager(
            address(usdcToken),
            address(platformToken),
            address(mockCompound)
        );

        // Set up permissions
        platformToken.setDepositManager(address(depositManager));
    }

    function testInitialState() public view {
        assertEq(platformToken.name(), "Cut Platform Token");
        assertEq(platformToken.symbol(), "CUT");
        assertEq(platformToken.decimals(), 18);
        assertEq(platformToken.totalSupply(), 0);
        assertEq(platformToken.depositManager(), address(depositManager));
    }

    function testSetDepositManager() public {
        address newDepositManager = address(0x999);
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

    function testMintByDepositManager() public {
        uint256 amount = 1000 * 1e18;
        
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

    function testBurnByDepositManager() public {
        uint256 amount = 1000 * 1e18;
        
        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        
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

    function testTransfer() public {
        uint256 amount = 1000 * 1e18;
        
        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        
        // Transfer tokens
        vm.prank(user1);
        platformToken.transfer(user2, amount / 2);
        
        assertEq(platformToken.balanceOf(user1), amount / 2);
        assertEq(platformToken.balanceOf(user2), amount / 2);
    }

    function testTransferFrom() public {
        uint256 amount = 1000 * 1e18;
        
        // First mint some tokens
        vm.prank(address(depositManager));
        platformToken.mint(user1, amount);
        
        // Approve and transfer
        vm.prank(user1);
        platformToken.approve(user2, amount);
        
        vm.prank(user2);
        platformToken.transferFrom(user1, address(0x3), amount / 2);
        
        assertEq(platformToken.balanceOf(user1), amount / 2);
        assertEq(platformToken.balanceOf(address(0x3)), amount / 2);
    }
}
