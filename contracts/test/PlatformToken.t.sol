// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PlatformToken.sol";
import "../src/Treasury.sol";
import "../src/PaymentToken.sol";
import "./MockCompound.sol";

contract PlatformTokenTest is Test {
    PlatformToken public token;
    Treasury public treasury;
    PaymentToken public paymentToken;
    address public owner;
    address public user;
    MockCToken public mockCUSDC;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        token = new PlatformToken();
        paymentToken = new PaymentToken();
        
        mockCUSDC = new MockCToken(address(paymentToken));
        // Mint a large amount of USDC to the MockCToken contract
        paymentToken.mint(address(mockCUSDC), 1_000_000_001e6);
        treasury = new Treasury(
            address(paymentToken),
            address(token),
            address(mockCUSDC)
        );
        // Set treasury in platform token
        token.setTreasury(address(treasury));
    }

    function testTokenProperties() public {
        assertEq(token.name(), "Cut Platform Token");
        assertEq(token.symbol(), "CUT");
        assertEq(token.decimals(), 18);
    }

    function testSetTreasury() public {
        address newTreasury = address(0x999);
        token.setTreasury(newTreasury);
        assertEq(token.treasury(), newTreasury);
    }

    function testFailSetTreasuryNotOwner() public {
        vm.startPrank(user);
        token.setTreasury(address(0x999));
        vm.stopPrank();
    }

    function testFailSetTreasuryZeroAddress() public {
        token.setTreasury(address(0));
    }

    function testMintByTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 100);
    }

    function testBurnByTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        token.burn(user, 50);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 50);
    }

    function testFailMintNotTreasury() public {
        vm.startPrank(user);
        token.mint(user, 100);
        vm.stopPrank();
    }

    function testFailBurnNotTreasury() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.burn(user, 50);
        vm.stopPrank();
    }

    function testFailBurnMoreThanBalance() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        token.burn(user, 150);
        vm.stopPrank();
    }

    function testTransfer() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.transfer(address(0x2), 50);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 50);
        assertEq(token.balanceOf(address(0x2)), 50);
    }

    function testFailTransferInsufficientBalance() public {
        vm.startPrank(user);
        token.transfer(address(0x2), 100);
        vm.stopPrank();
    }

    function testApprove() public {
        vm.startPrank(user);
        token.approve(address(0x2), 100);
        vm.stopPrank();
        
        assertEq(token.allowance(user, address(0x2)), 100);
    }

    function testTransferFrom() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.approve(address(0x2), 100);
        vm.stopPrank();
        
        vm.startPrank(address(0x2));
        token.transferFrom(user, address(0x3), 50);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user), 50);
        assertEq(token.balanceOf(address(0x3)), 50);
        assertEq(token.allowance(user, address(0x2)), 50);
    }

    function testFailTransferFromInsufficientAllowance() public {
        vm.startPrank(address(treasury));
        token.mint(user, 100);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.approve(address(0x2), 30);
        vm.stopPrank();
        
        vm.startPrank(address(0x2));
        token.transferFrom(user, address(0x3), 50);
        vm.stopPrank();
    }

    function testFailTransferFromInsufficientBalance() public {
        vm.startPrank(address(treasury));
        token.mint(user, 30);
        vm.stopPrank();
        
        vm.startPrank(user);
        token.approve(address(0x2), 100);
        vm.stopPrank();
        
        vm.startPrank(address(0x2));
        token.transferFrom(user, address(0x3), 50);
        vm.stopPrank();
    }
} 