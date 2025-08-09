// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PlatformToken.sol";
import "../src/TokenManager.sol";
import "../src/PaymentToken.sol";

contract PlatformTokenTest is Test {
    PlatformToken public token;
    TokenManager public tokenManager;
    PaymentToken public paymentToken;

    function setUp() public {
        paymentToken = new PaymentToken();
        token = new PlatformToken();
        
        tokenManager = new TokenManager(
            address(paymentToken),
            address(token),
            address(0x123) // Mock cUSDC address
        );
        
        // Set token manager in platform token
        token.setTokenManager(address(tokenManager));
    }

    function testSetTokenManager() public {
        address newTokenManager = address(0x999);
        token.setTokenManager(newTokenManager);
        assertEq(token.tokenManager(), newTokenManager);
    }

    function testFailSetTokenManagerNotOwner() public {
        vm.startPrank(address(0x123));
        token.setTokenManager(address(0x999));
        vm.stopPrank();
    }

    function testFailSetTokenManagerZeroAddress() public {
        token.setTokenManager(address(0));
    }

    function testMintByTokenManager() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(0x123)), 1000e18);
    }

    function testBurnByTokenManager() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.burn(address(0x123), 500e18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(0x123)), 500e18);
    }

    function testFailMintNotTokenManager() public {
        vm.startPrank(address(0x123));
        token.mint(address(0x456), 1000e18);
        vm.stopPrank();
    }

    function testFailBurnNotTokenManager() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        vm.stopPrank();
        
        vm.startPrank(address(0x456));
        token.burn(address(0x123), 500e18);
        vm.stopPrank();
    }

    function testFailBurnInsufficientBalance() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.burn(address(0x123), 1500e18); // Try to burn more than balance
        vm.stopPrank();
    }

    function testFailMintToZeroAddress() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0), 1000e18);
        vm.stopPrank();
    }

    function testFailBurnFromZeroAddress() public {
        vm.startPrank(address(tokenManager));
        token.burn(address(0), 1000e18);
        vm.stopPrank();
    }

    function testFailMintZeroAmount() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 0);
        vm.stopPrank();
    }

    function testFailBurnZeroAmount() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.burn(address(0x123), 0);
        vm.stopPrank();
    }

    function testTokenManagerNotSet() public {
        PlatformToken newToken = new PlatformToken();
        
        vm.startPrank(address(tokenManager));
        vm.expectRevert("TokenManager not set");
        newToken.mint(address(0x123), 1000e18);
        vm.stopPrank();
    }

    function testTokenManagerAddress() public {
        vm.startPrank(address(0x123));
        vm.expectRevert("Only tokenManager can call this function");
        token.mint(address(0x456), 1000e18);
        vm.stopPrank();
    }

    function testBurnExactAmount() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.burn(address(0x123), 1000e18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(0x123)), 0);
    }

    function testMultipleMints() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.mint(address(0x123), 500e18);
        token.mint(address(0x456), 750e18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(0x123)), 1500e18);
        assertEq(token.balanceOf(address(0x456)), 750e18);
    }

    function testMultipleBurns() public {
        vm.startPrank(address(tokenManager));
        token.mint(address(0x123), 1000e18);
        token.burn(address(0x123), 300e18);
        token.burn(address(0x123), 200e18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(0x123)), 500e18);
    }
} 