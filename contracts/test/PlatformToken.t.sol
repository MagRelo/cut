// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PlatformToken.sol";

contract PlatformTokenTest is Test {
    PlatformToken public token;
    address public user;

    function setUp() public {
        user = address(0x1);
        token = new PlatformToken("BetTheCut", "BTCUT");
    }

    function testMint() public {
        token.mint(user, 100);
        assertEq(token.balanceOf(user), 100);
    }

    function testBurn() public {
        token.mint(user, 100);
        token.burn(user, 50);
        assertEq(token.balanceOf(user), 50);
    }
} 